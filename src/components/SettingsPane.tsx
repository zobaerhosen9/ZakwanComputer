import React, { useState } from "react";
import { 
  Settings, 
  UserCheck, 
  ShieldCheck, 
  Building, 
  MapPin, 
  Phone, 
  Mail, 
  Lock, 
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { ShopSettings } from "../types";
import { parseInputNumber } from "../utils";

interface SettingsPaneProps {
  role: "অ্যাডমিন" | "সেলসম্যান";
  currentUserName: string;
  onRoleChange: (newRole: "অ্যাডমিন" | "সেলসম্যান") => void;
  shopSettings: ShopSettings;
  onUpdateShopSettings: (settings: Partial<ShopSettings>) => Promise<void>;
  onTriggerDatabaseWipeAndSeed: () => Promise<void>;
  onTriggerDatabaseWipeAndZero: () => Promise<void>;
}

export default function SettingsPane({
  role,
  currentUserName,
  onRoleChange,
  shopSettings,
  onUpdateShopSettings,
  onTriggerDatabaseWipeAndSeed,
  onTriggerDatabaseWipeAndZero
}: SettingsPaneProps) {
  // Pin entry states
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [showPinInput, setShowPinInput] = useState(false);

  // Shop details edit states
  const [sName, setSName] = useState(shopSettings?.shopName || "যাকওয়ান কম্পিউটার এন্ড স্ট্যাশনারী");
  const [sAddress, setSAddress] = useState(shopSettings?.address || "মেসার্স যাকওয়ান ভিলা, কলেজ রোড, চট্টগ্রাম");
  const [sPhone, setSPhone] = useState(shopSettings?.phone || "01876543210");
  const [sEmail, setSEmail] = useState(shopSettings?.email || "jakwancomputer@gmail.com");

  // Loaders
  const [saveLoading, setSaveLoading] = useState(false);
  const [wipeLoading, setWipeLoading] = useState(false);

  // Submit Role Change Pin verification
  const handleAdminRoleReq = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");
    
    // Support both Bengali PIN "১২৩৪" or standard "1234"
    if (pinInput === "1234" || pinInput === "১২৩৪") {
      onRoleChange("অ্যাডমিন");
      setPinInput("");
      setShowPinInput(false);
      alert("অভিনন্দন! আপনি সফলভাবে অ্যাডমিন হিসেবে লগইন করেছেন।");
    } else {
      setPinError("ভুল পিন নম্বর! আবার চেষ্টা করুন। (সঠিক ডেমো পিন: 1234)");
    }
  };

  // Convert role to salesperson without PIN
  const handleSalesmanRoleReq = () => {
    onRoleChange("সেলসম্যান");
    alert("আপনি সফলভাবে সেলসম্যান অ্যাকাউন্টে প্রবেশ করেছেন। লাভ ও ক্রয়মূল্য সীমিত করা হয়েছে।");
  };

  // Trigger Save shop settings
  const handleSaveShopSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName.trim()) {
      alert("দোকানের নাম শূন্য হতে পারে না!");
      return;
    }

    setSaveLoading(true);
    try {
      await onUpdateShopSettings({
        shopName: sName,
        address: sAddress,
        phone: sPhone,
        email: sEmail
      });
      alert("দোকানের পরিচিতি ও সেটিংস সফলভাবে আপডেট হয়েছে!");
    } catch (err: any) {
      alert("আপডেট ব্যর্থ হয়েছে: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Trigger seed wipe
  const handleWipeAndSeed = async () => {
    if (role !== "অ্যাডমিন") {
      alert("শুধুমাত্র অ্যাডমিন পুরো ডাটাবেজ নিয়ন্ত্রণ করতে পারবে!");
      return;
    }

    if (confirm("সতর্কতা: আপনি কি নিশ্চিত যে আপনি ডাটাবেজের সব তথ্য মুছে পুনরায় ডেমো ডাটা সিড করতে চান? \n\nএই অ্যাকশনে সব ডাইনামিক সেলস ও বিল ট্রানজেকশন মুছে যাবে!")) {
      setWipeLoading(true);
      try {
        await onTriggerDatabaseWipeAndSeed();
        alert("ডাটাবেজ রি-সিড সম্পন্ন হয়েছে! পেজটি পুনরায় রিফ্রেশ হবে।");
        window.location.reload();
      } catch (err: any) {
        alert("ডাটাবেজ ওয়াইপ করতে সমস্যা: " + err.message);
      } finally {
        setWipeLoading(false);
      }
    }
  };

  // Trigger zero wipe (all accounting set to zero)
  const handleWipeAndZero = async () => {
    if (role !== "অ্যাডমিন") {
      alert("শুধুমাত্র অ্যাডমিন পুরো ডাটাবেজ নিয়ন্ত্রণ করতে পারবে!");
      return;
    }

    if (confirm("সতর্কতা: আপনি কি নিশ্চিত যে সব হিসাব-নিকাশ এবং স্টক জিরো (০) করতে চান? \n\nএই অ্যাকশনে সব ক্যাশ মেমো, বেচাকেনা, খরচ, কাস্টমার/সাপ্লায়ার বকেয়া এবং পণ্যের স্টক ডিলিট হয়ে একদম শুন্য (০) হয়ে যাবে!")) {
      setWipeLoading(true);
      try {
        await onTriggerDatabaseWipeAndZero();
        alert("সব হিসাব-নিকাশ এবং স্টক সফলভাবে জিরো (০) করা হয়েছে! পেজটি পুনরায় রিফ্রেশ হবে।");
        window.location.reload();
      } catch (err: any) {
        alert("হিসাব জিরো করতে সমস্যা: " + err.message);
      } finally {
        setWipeLoading(false);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="settings_panel">
      {/* Col 1: Role controller block */}
      <div className="bg-white p-6 border rounded-xl shadow-xs space-y-6">
        <div>
          <h4 className="text-slate-700 font-bold text-base flex items-center gap-1.5 font-sans">
            <Lock className="w-5 h-5 text-teal-600" />
            <span>সফটওয়্যার রোল ও অ্যাক্সেস কনট্রোল</span>
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            অ্যাডমিন এবং সেলসম্যান রোলের মধ্যে পরিবর্তন করুন।
          </p>
        </div>

        {/* Current status display */}
        <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/15 flex items-center justify-between font-sans">
          <div>
            <span className="text-xs text-slate-500 block">চলতি সক্রিয় অ্যাকাউন্ট:</span>
            <strong className="text-sm text-slate-800">{currentUserName} ({role})</strong>
          </div>
          <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${role === "অ্যাডমিন" ? 'bg-teal-100 text-teal-800 border border-teal-200' : 'bg-slate-100 text-slate-600 border border-slate-250'}`}>
            {role === "অ্যাডমিন" ? "🛡 এডমিন এক্সেস সক্রিয়" : "👤 সেলসম্যান লিমিটেড"}
          </span>
        </div>

        {/* Switch toggles */}
        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-700 block">রোল পরিবর্তন করুন:</label>
          <div className="flex gap-4">
            <button 
              type="button"
              onClick={handleSalesmanRoleReq}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${role === "সেলসম্যান" ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'}`}
            >
              👤 সেলসম্যান রোল (Salesperson)
            </button>
            <button 
              type="button"
              onClick={() => {
                if (role === "অ্যাডমিন") {
                  alert("আপনি ইতিমধ্যেই এডমিন অ্যাকাউন্টে আছেন!");
                  return;
                }
                setShowPinInput(!showPinInput);
                setPinInput("");
                setPinError("");
              }}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${role === "অ্যাডমিন" ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-white hover:bg-emerald-50 border-slate-200 text-slate-600'}`}
            >
              🛡 অ্যাডমিন রোল (Administrator)
            </button>
          </div>

          {/* Secure Admin Gate Pin Entry Form */}
          {showPinInput && (
            <form onSubmit={handleAdminRoleReq} className="p-4 border border-teal-100 bg-teal-50/15 rounded-xl space-y-3 animate-slide-up">
              <span className="text-xs text-slate-600 block font-semibold">এডমিন এক্সেস পিন কোড ইনপুট করুন:</span>
              <div className="flex gap-2">
                <input 
                  type="password" 
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="ডিফল্ট ডেমো পিন: 1234"
                  className="flex-1 text-xs border border-slate-250 p-2.5 rounded-lg focus:outline-hidden focus:border-teal-500 font-mono"
                  autoFocus
                />
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
                >
                  সাবমিট পিন
                </button>
              </div>
              {pinError && <p className="text-[10px] text-rose-600 font-semibold">⚠ {pinError}</p>}
            </form>
          )}
        </div>
      </div>

      {/* Col 2: Store Contact profile editing */}
      <div className="bg-white p-6 border rounded-xl shadow-xs space-y-6">
        <div>
          <h4 className="text-slate-700 font-bold text-base flex items-center gap-1.5 font-sans">
            <Building className="w-5 h-5 text-teal-600" />
            <span>দোকান পরিচিতি ও রশিদ সেটিংস</span>
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            ক্যাশ মেমোর উপরে প্রদর্শিত দোকানের তথ্য পরিবর্তন করুন।
          </p>
        </div>

        <form onSubmit={handleSaveShopSettings} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">দোকানের নাম (Bengali)*</label>
            <input 
              type="text" 
              value={sName}
              onChange={(e) => setSName(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-sans"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">দোকানের পূর্ণ ঠিকানা</label>
            <input 
              type="text" 
              value={sAddress}
              onChange={(e) => setSAddress(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-sans"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">মোবাইল ফোন নম্বর</label>
              <input 
                type="text" 
                value={sPhone}
                onChange={(e) => setSPhone(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">ইমেইল ঠিকানা</label>
              <input 
                type="email" 
                value={sEmail}
                onChange={(e) => setSEmail(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-teal-500 font-sans"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={saveLoading}
            className="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {saveLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
            <span>দোকান তথ্য সংরক্ষণ করুন</span>
          </button>
        </form>

        {/* Database administration (Admin only) */}
        {role === "অ্যাডমিন" && (
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
              <Database className="w-4 h-4" />
              <span>ডাটাবেজ এবং ডেমো ম্যানেজার</span>
            </span>
            <p className="text-[11px] text-slate-400 leading-normal">
              সিস্টেমের ডেমো ডাটা এবং জিরো-স্টেট বা একদম নতুন স্টার্ট করার জন্য নিচের অপশনগুলো ব্যবহার করুন:
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button 
                type="button"
                onClick={handleWipeAndSeed}
                disabled={wipeLoading}
                className="flex-1 px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                {wipeLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>ডাটা মুছে টেস্ট ডেমো সিড (Seed) করুন</span>
              </button>
              
              <button 
                type="button"
                onClick={handleWipeAndZero}
                disabled={wipeLoading}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 border border-amber-500 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
              >
                {wipeLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <AlertTriangle className="w-3.5 h-3.5 text-slate-900" />
                <span>সব হিসাবপত্র ০ (Zero) করুন</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
