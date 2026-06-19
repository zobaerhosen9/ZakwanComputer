import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API: AI Business Advisor using Google GenAI SDK
app.post("/api/advisor", async (req, res) => {
  try {
    const { totalSales, totalProfit, totalExpenses, lowStockProducts, productMetrics } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      return res.status(400).json({ 
        error: "দুঃখিত! সিস্টেমে কোনো জেমিনী এআই কী (GEMINI_API_KEY) খুঁজে পাওয়া যায়নি। দয়া করে সেটিংস থেকে কী কনফিগার করুন।" 
      });
    }

    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    
    // Construct rich shop status details
    const prompt = `
আপনি "যাকওয়ান কম্পিউটার এন্ড স্ট্যাশনারী" এর একজন অত্যন্ত দক্ষ বাঙালি বিজনেস এডভাইজর এবং ফাইনান্সিয়াল এনালাইসিস্ট।
দোকানের বর্তমান অবস্থা নিম্নরূপ:

১. মোট বিক্রি: ৳ ${totalSales}
২. আনুমানিক মোট লাভ: ৳ ${totalProfit}
৩. মোট সাধারণ খরচ: ৳ ${totalExpenses}
৪. বর্তমান স্টক কম থাকা পণ্যের তালিকা: ${JSON.stringify(lowStockProducts)}
৫. প্রধান পণ্যসমূহ ও তাদের স্টক: ${JSON.stringify(productMetrics)}

উপরের তথ্যের উপর ভিত্তি করে দোকানের মালিকের জন্য একটি প্রফেশনাল এবং কার্যকরী বাংলা বিজনেস রিপোর্ট তৈরি করুন। রিপোর্টে নিম্নলিখিত বিষয়গুলো সুন্দর এবং আকর্ষণীয় বাংলা বুলেট পয়েন্টের মাধ্যমে তুলে ধরবেন:
- স্টোর বা দোকানের বর্তমান আর্থিক সক্ষমতার সংক্ষিপ্ত পর্যালোচনা।
- কোন কোন নতুন স্টেশনারি বা কম্পিউটার আইটেম এই মাসে বেশি স্টক করা উচিত এবং কোনটি দ্রুত ফুরিয়ে যাওয়ার আশংকায় আছে।
- খরচ কমানো বা লাভ বাড়ানোর জন্য বাস্তবসম্মত ব্যবসায়ী পরামর্শ।
- গ্রাহকের অভিজ্ঞতা বা বাকী আদায় উন্নত করার ট্রিকস।

দয়া করে কোনো অবান্তর টেকনিক্যাল সোর্স কোড বা ইনফো উহ্য রাখবেন। শুধুমাত্র বিশুদ্ধ, ঝরঝরে বাংলা টেক্সট বা সুন্দর মার্কডাউন এবং ইমোজি সম্বলিত দিকনির্দেশনা প্রদান করুন।
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({
      advice: response.text || "রিপোর্ট তৈরিতে ব্যস্ততা দেখা দিয়েছে, দয়া করে আবার চেষ্টা করুন।"
    });

  } catch (error: any) {
    console.error("AI Advisor Error:", error);
    res.status(500).json({ 
      error: "সার্ভারে এআই রিপোর্ট তৈরিতে কোনো সমস্যা হয়েছে। " + (error?.message || "")
    });
  }
});

// Serve health/check API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Jakwan Computer Backend" });
});

async function main() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Jakwan OS Server] running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

main().catch((err) => {
  console.error("Server Crash Error:", err);
});
