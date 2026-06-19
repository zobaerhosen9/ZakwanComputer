import React, { useState } from "react";
import { 
  Users, 
  Phone, 
  MapPin, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  RefreshCw, 
  Trash2,
  Lock,
  UserCheck,
  CheckCircle2
} from "lucide-react";
import { Customer, Supplier } from "../types";
import { formatCurrency, convertEnglishToBengaliNumber, parseInputNumber } from "../utils";

interface PartiesProps {
  customers: Customer[];
  suppliers: Supplier[];
  role: "অ্যাডমিন" | "সেলসম্যান";
  onAddCustomer: (cust: Omit<Customer, "id">) => Promise<void>;
  onAddSupplier: (sup: Omit<Supplier, "id">) => Promise<void>;
  onUpdateCustomerDue: (id: string, dueChange: number) => Promise<void>;
  onUpdateSupplierDue: (id: string, dueChange: number) => Promise<void>;
}

export default function Parties({
  customers,
  suppliers,
  role,
  onAddCustomer,
  onAddSupplier,
  onUpdateCustomerDue,
  onUpdateSupplierDue
}: PartiesProps) {
  // Tabs: "customers" or "suppliers"
  const [activeSegment, setActiveSegment] = useState<"customers" | "suppliers">("customers");

  // Customer Form state
  const [cModalOpen, setCModalOpen] = useState(false);
  const [cName, setCName] = useState("");
  const [cMobile, setCMobile] = useState("");
  const [cAddress, setCAddress] = useState("");
  const [cDue, setCDue] = useState("");

  // Supplier Form state
  const [sModalOpen, setSModalOpen] = useState(false);
  const [sName, setSName] = useState("");
  const [sContact, setSContact] = useState("");
  const [sPhone, setSPhone] = useState("");
  const [sAddress, setSAddress] = useState("");
  const [sDue, setSDue] = useState("");

  // Payment Settlement Dialog State (আদায় বা দেনা শোধ)
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleTargetType, setSettleTargetType] = useState<"customer" | "supplier">("customer");
  const [settleTargetId, setSettleTargetId] = useState("");
  const [settleTargetName, setSettleTargetName] = useState("");
  const [settleTargetCurrentDue, setSettleTargetCurrentDue] = useState(0);
  const [settleAmountVal, setSettleAmountVal] = useState("");

  // loading state
  const [actionLoading, setActionLoading] = useState(false);

  const toBnNum = (val: number | string) => convertEnglishToBengaliNumber(val);

  // Add Customer submit
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim() || !cMobile.trim()) {
      alert("কাস্টমারের নাম এবং মোবাইল নম্বর আবশ্যক!");
      return;
    }

    setActionLoading(true);
    try {
      await onAddCustomer({
        name: cName.trim(),
        mobile: cMobile.trim(),
        address: cAddress.trim(),
        totalDue: parseInputNumber(cDue)
      });
      setCName("");
      setCMobile("");
      setCAddress("");
      setCDue("");
      setCModalOpen(false);
      alert("সাফল্যের সাথে কাস্টমার যুক্ত হয়েছে!");
    } catch (err: any) {
      alert("কাস্টমার যুক্ত করতে ব্যর্থ: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Add Supplier submit
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName.trim() || !sPhone.trim()) {
      alert("সরবরাহকারী প্রতিষ্ঠানের নাম ও ফোন নম্বর আবশ্যক!");
      return;
    }

    setActionLoading(true);
    try {
      await onAddSupplier({
        name: sName.trim(),
        contactPerson: sContact.trim(),
        phone: sPhone.trim(),
        address: sAddress.trim(),
        totalDueToSupplier: parseInputNumber(sDue)
      });
      setSName("");
      setSContact("");
      setSPhone("");
      setSAddress("");
      setSDue("");
      setSModalOpen(false);
      alert("সরবরাহকারী সফলভাবে নথিভুক্ত হয়েছে!");
    } catch (err: any) {
      alert("সাপ্লায়ার যুক্ত করতে ব্যর্থ: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Settlement payment modal
  const handleOpenSettle = (type: "customer" | "supplier", id: string, name: string, due: number) => {
    setSettleTargetType(type);
    setSettleTargetId(id);
    setSettleTargetName(name);
    setSettleTargetCurrentDue(due);
    setSettleAmountVal("");
    setSettleOpen(true);
  };

  // Submit payment settlement (subduct remaining dues)
  const handleSubmitSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    const payAmt = parseInputNumber(settleAmountVal);
    if (payAmt <= 0) {
      alert("দয়া করে সঠিক পেমেন্ট পরিমাণ এন্ট্রি করুন!");
      return;
    }

    if (payAmt > settleTargetCurrentDue) {
      alert("পরিশোধিত অর্থ মোট বকেয়ার চেয়ে বেশি হতে পারে না!");
      return;
    }

    setActionLoading(true);
    try {
      if (settleTargetType === "customer") {
        // Since payment decreases outstanding due, we pass negative number
        await onUpdateCustomerDue(settleTargetId, -payAmt);
        alert(`সফলভাবে কাস্টমার "${settleTargetName}" হতে ${formatCurrency(payAmt)} আদায় রিসিভ করা হয়েছে!`);
      } else {
        // Supplier due payment decreases outstanding payload
        await onUpdateSupplierDue(settleTargetId, -payAmt);
        alert(`সাফল্যের সাথে সাপ্লায়ার "${settleTargetName}" কে ${formatCurrency(payAmt)} পরিশোধ শোধ করা হয়েছে!`);
      }
      setSettleOpen(false);
    } catch (err: any) {
      alert("পেমেন্ট ট্রানজেকশন সফল করা যায়নি: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6" id="parties_panel">
      {/* Action panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveSegment("customers")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeSegment === "customers" ? 'bg-blue-900 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            গ্রাহক তালিকা (Customers List)
          </button>
          <button 
            onClick={() => setActiveSegment("suppliers")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeSegment === "suppliers" ? 'bg-blue-900 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            সরবরাহকারী তালিকা (Suppliers Ledger)
          </button>
        </div>

        <div>
          {activeSegment === "customers" ? (
            <button 
              onClick={() => setCModalOpen(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন কাস্টমার রেজিস্ট্রার</span>
            </button>
          ) : (
            <button 
              onClick={() => setSModalOpen(true)}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন সাপ্লায়ার এন্ট্রি</span>
            </button>
          )}
        </div>
      </div>

      {/* SEGMENT 1: Customers list with outstanding dues */}
      {activeSegment === "customers" && (
        <div className="bg-white border rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b">
            <h4 className="text-sm font-bold text-slate-700">কাস্টমার বকেয়া খাতা</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">ক্রেতাদের বকেয়া জমা ও ক্যাশ আদায় পরিশোধ করার বুক</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-150">
                  <th className="py-3 px-4">কাস্টমার নাম & ঠিকানা</th>
                  <th className="py-3 px-4">মোবাইল নম্বর</th>
                  <th className="py-3 px-4 text-right">বকেয়া দাবি (Due Balance)</th>
                  <th className="py-3 px-4 text-center">অ্যাকশন / আদায়</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((cust) => {
                  const isGeneral = cust.mobile === "01700000000";
                  return (
                    <tr key={cust.id || cust.mobile} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{cust.name}</div>
                        <div className="text-[10px] text-slate-500 font-sans flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-slate-300" />
                          <span>{cust.address || "না দেওয়া ঠিকানা"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                        {cust.mobile}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {cust.totalDue > 0 ? (
                          <span className="font-mono font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100">
                            {formatCurrency(cust.totalDue)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">পরিশোধিত</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {cust.totalDue > 0 ? (
                          <button 
                            onClick={() => handleOpenSettle("customer", cust.id!, cust.name, cust.totalDue)}
                            className="bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold py-1 px-3 rounded-lg shadow-inner transition-all cursor-pointer"
                          >
                            টাকা আদায়
                          </button>
                        ) : (
                          <span className="text-slate-400 font-light text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEGMENT 2: Suppliers list with total payables (Admin restricted security check) */}
      {activeSegment === "suppliers" && (
        role === "অ্যাডমিন" ? (
          <div className="bg-white border rounded-xl shadow-xs overflow-hidden animate-fade-in">
            <div className="p-4 bg-slate-50/50 border-b">
              <h4 className="text-sm font-bold text-slate-700">সরবরাহকারী দেনা-পাওনা খতিয়ান</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">পাইকারি কন্টাক্ট এবং আমাদের থেকে তাদের পাওনা টাকার খাতা</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-150">
                    <th className="py-3 px-4">প্রতিষ্ঠান ও যোগাযোগ ব্যক্তি</th>
                    <th className="py-3 px-4">ফোন</th>
                    <th className="py-3 px-4">ঠিকানা</th>
                    <th className="py-3 px-4 text-right">আমাদের কাছে পাওনা</th>
                    <th className="py-3 px-4 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((sup) => (
                    <tr key={sup.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{sup.name}</div>
                        <div className="text-[10px] text-slate-500 font-sans">কন্টাক্ট: {sup.contactPerson || "অজানা"}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{sup.phone}</td>
                      <td className="py-3.5 px-4 text-slate-500">{sup.address}</td>
                      <td className="py-3.5 px-4 text-right">
                        {sup.totalDueToSupplier > 0 ? (
                          <span className="font-mono font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            {formatCurrency(sup.totalDueToSupplier)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold">৳0.00</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {sup.totalDueToSupplier > 0 ? (
                          <button 
                            onClick={() => handleOpenSettle("supplier", sup.id!, sup.name, sup.totalDueToSupplier)}
                            className="bg-blue-900 hover:bg-blue-800 text-white text-[10px] font-bold py-1 px-3 rounded-lg transition-all cursor-pointer"
                          >
                            দেনা শোধ
                          </button>
                        ) : (
                          <span className="text-emerald-600 text-xs font-bold">✓ পরিশোধিত</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white border rounded-2xl p-10 text-center shadow-xs flex flex-col items-center justify-center space-y-4 font-sans max-w-lg mx-auto">
            <div className="w-14 h-14 bg-amber-50 rounded-full text-amber-600 flex items-center justify-center">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">সরবরাহকারী পাওনা হিসাব লকড</h3>
              <p className="text-xs text-slate-400 mt-1 leading-normal">
                পাইকারি সাপ্লায়ার তালিকা, কন্টাক্ট ইনফরমেশন এবং দোকানের দায়দেনা শুধুমাত্র অ্যাকাউন্টস অ্যাডমিন (Admin) দেখতে পারবেন।
              </p>
            </div>
          </div>
        )
      )}

      {/* MODAL 1: ADD CUSTOMER */}
      {cModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print font-sans">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-teal-50 transform scale-100 transition-all">
            <div className="bg-gradient-to-r from-blue-900 to-[#0f766e] text-white p-5 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-sm font-bold">নতুন কাস্টমার নিবন্ধন ফরম</h3>
              <button onClick={() => setCModalOpen(false)} className="text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 p-1 rounded-full text-xs cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">কাস্টমারের নাম *</label>
                <input 
                  type="text" 
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  placeholder="যেমন: মো: শাহরিয়ার"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">মোবাইল নম্বর *</label>
                  <input 
                    type="text" 
                    value={cMobile}
                    onChange={(e) => setCMobile(e.target.value)}
                    placeholder="যেমন: 018xxxxxxxx"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-sans"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">বকেয়া ওপেনিং (ঐচ্ছিক ৳)</label>
                  <input 
                    type="number" 
                    value={cDue}
                    onChange={(e) => setCDue(e.target.value)}
                    placeholder="0"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">কাস্টমারের স্থায়ী ঠিকানা</label>
                <input 
                  type="text" 
                  value={cAddress}
                  onChange={(e) => setCAddress(e.target.value)}
                  placeholder="চকবাজার, চট্টগ্রাম"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setCModalOpen(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer">বাতিল</button>
                <button type="submit" disabled={actionLoading} className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all">
                  {actionLoading ? "সংরক্ষণ..." : "নিবন্ধন করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD SUPPLIER */}
      {sModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print font-sans">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-teal-50 transform scale-100 transition-all font-sans">
            <div className="bg-gradient-to-r from-blue-900 to-[#0f766e] text-white p-5 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-sm font-bold">নতুন পাইকারি সরবরাহকারী এন্ট্রি</h3>
              <button onClick={() => setSModalOpen(false)} className="text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 p-1 rounded-full text-xs cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">সরবরাহকারী এজেন্সির নাম *</label>
                <input 
                  type="text" 
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  placeholder="যেমন: স্মার্ট টেকনোলজি ডিস্ট্রিবিউটর"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">যোগাযোগের ব্যক্তি (Contact Person)</label>
                  <input 
                    type="text" 
                    value={sContact}
                    onChange={(e) => setSContact(e.target.value)}
                    placeholder="সোহেল আরমান"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block font-sans">ফোন নম্বর *</label>
                  <input 
                    type="text" 
                    value={sPhone}
                    onChange={(e) => setSPhone(e.target.value)}
                    placeholder="যেমন: 019xxxxxxxx"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-sans"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-bold text-slate-700 block">প্রাথমিক দেনা/পাওনা (যদি থাকে ৳)</label>
                  <input 
                    type="number" 
                    value={sDue}
                    onChange={(e) => setSDue(e.target.value)}
                    placeholder="0"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">ডিস্ট্রিবিউশন ঠিকানা</label>
                <input 
                  type="text" 
                  value={sAddress}
                  onChange={(e) => setSAddress(e.target.value)}
                  placeholder="আইডিবি ভবন, ঢাকা"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setSModalOpen(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer">বাতিল</button>
                <button type="submit" disabled={actionLoading} className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg cursor-pointer transition-all">
                  {actionLoading ? "সংরক্ষণ হচ্ছে..." : "এন্ট্রি করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PAYMENT SETTLEMENT (আদায় / বকেয়া শোধ) */}
      {settleOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print font-sans">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-teal-50 transform scale-100 transition-all font-sans">
            <div className="bg-slate-900 text-white p-5 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {settleTargetType === "customer font-semibold" ? "বকেয়া কাস্টমার নগদ আদায়" : "সাপ্লায়ার দেনা পরিশোধ রশিদ"}
              </h3>
              <button onClick={() => setSettleOpen(false)} className="text-slate-200 hover:text-white bg-white/10 hover:bg-white/25 p-1 rounded-full text-xs cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSubmitSettlement} className="p-6 space-y-4">
              <div className="p-3 bg-blue-50/50 rounded-xl space-y-1 border text-xs">
                <p><span className="text-slate-500">নাম/প্রতিষ্ঠান:</span> <strong className="text-slate-800">{settleTargetName}</strong></p>
                <p><span className="text-slate-500">চলতি বকেয়া (Outstanding):</span> <strong className="text-rose-600 font-mono text-sm">{formatCurrency(settleTargetCurrentDue)}</strong></p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-750 block">কত টাকা পরিশোধ/আদায় করতে চান? (৳)*</label>
                <input 
                  type="number" 
                  value={settleAmountVal}
                  onChange={(e) => setSettleAmountVal(e.target.value)}
                  placeholder={`সর্বোচ্চ ${settleTargetCurrentDue}`}
                  className="w-full text-sm border font-bold border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-mono text-slate-800"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setSettleOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg cursor-pointer">বাতিল</button>
                <button type="submit" disabled={actionLoading} className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all">
                  {actionLoading ? "লেজার সাবমিট হচ্ছে..." : "লেজার আপডেট করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
