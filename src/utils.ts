// helper utilities for Jakwan Computer Inventory & Accounting

/**
 * Formats a currency number into standard Bengali context currency layout: e.g. ৳ ১২,৫০০.০০
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return "৳ ০.০০";
  return new Intl.NumberFormat("bn-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
    .format(amount)
    .replace("BDT", "৳")
    .trim();
}

/**
 * Translates calendar date string (YYYY-MM-DD) to readable Bengali format
 */
export function formatDateBengali(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  
  const year = parts[0];
  const monthNames = [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
  ];
  const month = monthNames[parseInt(parts[1], 10) - 1];
  const day = parseInt(parts[2], 10);
  
  return `${convertEnglishToBengaliNumber(day)}ই ${month}, ${convertEnglishToBengaliNumber(parseInt(year, 10))}`;
}

/**
 * Simple English numbers to Bengali numbers conversion
 */
export function convertEnglishToBengaliNumber(num: number | string): string {
  const englishToBengaliMap: { [key: string]: string } = {
    "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪",
    "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯"
  };
  
  return String(num)
    .split("")
    .map((char) => englishToBengaliMap[char] || char)
    .join("");
}

/**
 * Safely parse numbers from inputs (supporting Bengali or normal digits)
 */
export function parseInputNumber(val: string): number {
  if (!val) return 0;
  // Convert standard Bengali digits to English digits if typed by user
  const bengaliToEnglishMap: { [key: string]: string } = {
    "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
    "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9"
  };
  
  let sanitized = val.split("").map(char => bengaliToEnglishMap[char] || char).join("");
  const parsed = parseFloat(sanitized);
  return isNaN(parsed) ? 0 : parsed;
}

export const CATEGORIES_BN: { [key: string]: string } = {
  computer_parts: "কম্পিউটার পার্টস",
  accessories: "এক্সেসরিজ",
  stationery: "স্টেশনারি",
  printing_paper: "কাগজ ও প্রিন্টিং",
  services: "সার্ভিসিং ও ফটোস্ট্যাট"
};
