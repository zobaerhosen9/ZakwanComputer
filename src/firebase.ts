import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  collection, 
  getDocs, 
  writeBatch,
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
const dbId = (!firebaseConfig.firestoreDatabaseId || firebaseConfig.firestoreDatabaseId === "default")
  ? undefined
  : firebaseConfig.firestoreDatabaseId;

export const db = dbId 
  ? initializeFirestore(app, { experimentalForceLongPolling: true }, dbId)
  : initializeFirestore(app, { experimentalForceLongPolling: true });

// Collection References
export const productsRef = collection(db, "products");
export const categoriesRef = collection(db, "categories");
export const salesRef = collection(db, "sales");
export const purchasesRef = collection(db, "purchases");
export const expensesRef = collection(db, "expenses");
export const customersRef = collection(db, "customers");
export const suppliersRef = collection(db, "suppliers");
export const settingsRef = collection(db, "settings");

// Seeding standard computer and stationery data if empty
export async function seedInitialDataIfEmpty() {
  try {
    const pSnap = await getDocs(productsRef);
    if (!pSnap.empty) {
      console.log("Database already has data. Skipping seed.");
      return;
    }

    console.log("No products found, seeding default Jakwan Computer data...");
    const batch = writeBatch(db);

    // 1. Categories
    const defaultCategories = [
      { id: "computer_parts", name: "কম্পিউটার পার্টস (Parts)", description: "RAM, SSD, Processor, etc." },
      { id: "accessories", name: "এক্সেসরিজ (Accessories)", description: "Mouse, Keyboard, Headphone" },
      { id: "stationery", name: "স্টেশনারি (Stationery)", description: "Pen, Pencil, Notebook, File" },
      { id: "printing_paper", name: "কাগজ ও প্রিন্টিং (Paper & Printing)", description: "A4 Paper, Photo Paper, Toners" },
      { id: "services", name: "সার্ভিসিং ও ফটোস্ট্যাট (Services)", description: "Photocopy, Printing, Repairing" }
    ];

    defaultCategories.forEach((cat) => {
      const cRef = doc(categoriesRef, cat.id);
      batch.set(cRef, {
        name: cat.name,
        description: cat.description,
        createdAt: serverTimestamp()
      });
    });

    // 2. Default Customers
    const defaultCustomers = [
      { id: "cust_general", name: "সাধারণ কাস্টমার", mobile: "01700000000", totalDue: 0, address: "খুচরা বাজার" },
      { id: "cust_1", name: "মো: আরিফুল ইসলাম", mobile: "01812345678", totalDue: 1200, address: "চকবাজার, ঢাকা" },
      { id: "cust_2", name: "রনি স্টুডিও", mobile: "01998765432", totalDue: 0, address: "স্কুল রোড" }
    ];

    defaultCustomers.forEach((cust) => {
      const custRef = doc(customersRef, cust.id);
      batch.set(custRef, {
        name: cust.name,
        mobile: cust.mobile,
        totalDue: cust.totalDue,
        address: cust.address,
        createdAt: serverTimestamp()
      });
    });

    // 3. Default Suppliers
    const defaultSuppliers = [
      { id: "sup_1", name: "গিগাবাইট বাংলাদেশ ডিস্ট্রিবিউশন", contactPerson: "সোহেল রানা", phone: "01711223344", totalDueToSupplier: 4500, address: "মাল্টিপ্ল্যান সেন্টার, ঢাকা" },
      { id: "sup_2", name: "রয়েল কম্পিউটার সাপ্লাইস", contactPerson: "কামরুল হাসান", phone: "01522334455", totalDueToSupplier: 0, address: "নিলক্ষেত বুক মার্কেট" }
    ];

    defaultSuppliers.forEach((sup) => {
      const supRef = doc(suppliersRef, sup.id);
      batch.set(supRef, {
        name: sup.name,
        contactPerson: sup.contactPerson,
        phone: sup.phone,
        totalDueToSupplier: sup.totalDueToSupplier,
        address: sup.address,
        createdAt: serverTimestamp()
      });
    });

    // 4. Products List
    const defaultProducts = [
      { id: "prod_01", name: "A4 Paper Double A 80GSM", category: "printing_paper", buyPrice: 420, sellPrice: 480, stock: 25, alertLimit: 5, sku: "DA-A4-80G", shelf: "র্যাক A-১", imageUrl: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&q=80&w=300" },
      { id: "prod_02", name: "Adata 120GB SATA SSD", category: "computer_parts", buyPrice: 1350, sellPrice: 1650, stock: 12, alertLimit: 3, sku: "AD-120G-SSD", shelf: "কাঁচের ক্যাবিনেট ১", imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300" },
      { id: "prod_03", name: "A4tech OP-620D USB Mouse", category: "accessories", buyPrice: 320, sellPrice: 420, stock: 18, alertLimit: 4, sku: "A4-OP620", shelf: "র্যাক B-৩", imageUrl: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&q=80&w=300" },
      { id: "prod_04", name: "Matador Pinpoint Ball Pen (Box of 20)", category: "stationery", buyPrice: 80, sellPrice: 100, stock: 15, alertLimit: 2, sku: "MT-PINPOINT", shelf: "টেবিল ড্রয়ার ২", imageUrl: "https://images.unsplash.com/photo-1585336261022-675929945037?auto=format&fit=crop&q=80&w=300" },
      { id: "prod_05", name: "A4 Size File Folder (Plastic)", category: "stationery", buyPrice: 18, sellPrice: 30, stock: 80, alertLimit: 15, sku: "FLD-A4-PL", shelf: "র্যাক C-১", imageUrl: "https://images.unsplash.com/photo-1595079676339-1534801ad6cf?auto=format&fit=crop&q=80&w=300" },
      { id: "prod_06", name: "Intel Core i3 10th Gen Processor", category: "computer_parts", buyPrice: 7500, sellPrice: 8500, stock: 4, alertLimit: 1, sku: "INTEL-I3-10", shelf: "কাঁচের ক্যাবিনেট ২", imageUrl: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=300" },
      { id: "prod_07", name: "A4tech KR-85 USB Keyboard", category: "accessories", buyPrice: 550, sellPrice: 650, stock: 8, alertLimit: 2, sku: "A4-KR85", shelf: "র্যাক B-২", imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=300" }
    ];

    defaultProducts.forEach((prod) => {
      const pRef = doc(productsRef, prod.id);
      batch.set(pRef, {
        name: prod.name,
        category: prod.category,
        buyPrice: prod.buyPrice,
        sellPrice: prod.sellPrice,
        stock: prod.stock,
        alertLimit: prod.alertLimit,
        sku: prod.sku,
        shelf: prod.shelf,
        imageUrl: prod.imageUrl,
        createdAt: serverTimestamp()
      });
    });

    // 5. Default Shop Settings
    const setRef = doc(settingsRef, "shop_info");
    batch.set(setRef, {
      shopName: "যাকওয়ান কম্পিউটার এন্ড স্ট্যাশনারী",
      address: "মেসার্স যাকওয়ান ভিলা, কলেজ রোড, চট্টগ্রাম",
      phone: "01876543210",
      email: "jakwancomputer@gmail.com",
      currency: "৳",
      vatRate: 0,
      updatedAt: serverTimestamp()
    });

    // 6. Default Expense entries to make profit-loss graphs realistic
    const sampleExpenses = [
      { id: "exp_1", title: "দোকান ভাড়া জুন ২০২৬", category: "দোকান ভাড়া", amount: 3500, date: "2026-06-01" },
      { id: "exp_2", title: "বিদ্যুৎ বিল জুন ২০২৬", category: "বিদ্যুৎ বিল", amount: 1200, date: "2026-06-15" },
      { id: "exp_3", title: "স্টাফ চা-নাস্তা খরচ", category: "আপ্যায়ন ও বিবিধ", amount: 320, date: "2026-06-18" }
    ];
    sampleExpenses.forEach((exp) => {
      const eRef = doc(expensesRef, exp.id);
      batch.set(eRef, {
        title: exp.title,
        category: exp.category,
        amount: exp.amount,
        date: exp.date,
        createdAt: serverTimestamp()
      });
    });

    // 7. Default Sales for realistic charts
    const sampleSales = [
      {
        id: "sale_1",
        customerName: "মো: আরিফুল ইসলাম",
        customerMobile: "01812345678",
        items: [
          { productId: "prod_02", productName: "Adata 120GB SATA SSD", qty: 2, sellPrice: 1650, buyPrice: 1350 }
        ],
        subTotal: 3300,
        discount: 200,
        total: 3100,
        paid: 1900,
        due: 1200,
        date: "2026-06-16",
        salesperson: "সেলসম্যান",
        createdAt: serverTimestamp()
      },
      {
        id: "sale_2",
        customerName: "রনি স্টুডিও",
        customerMobile: "01998765432",
        items: [
          { productId: "prod_01", productName: "A4 Paper Double A 80GSM", qty: 5, sellPrice: 480, buyPrice: 420 },
          { productId: "prod_03", productName: "A4tech OP-620D USB Mouse", qty: 1, sellPrice: 420, buyPrice: 320 }
        ],
        subTotal: 2820,
        discount: 120,
        total: 2700,
        paid: 2700,
        due: 0,
        date: "2026-06-17",
        salesperson: "অ্যাডমিন",
        createdAt: serverTimestamp()
      },
      {
        id: "sale_3",
        customerName: "সাধারণ কাস্টমার",
        customerMobile: "01700000000",
        items: [
          { productId: "prod_04", productName: "Matador Pinpoint Ball Pen (Box of 20)", qty: 1, sellPrice: 100, buyPrice: 80 },
          { productId: "prod_05", productName: "A4 Size File Folder (Plastic)", qty: 5, sellPrice: 30, buyPrice: 18 }
        ],
        subTotal: 250,
        discount: 0,
        total: 250,
        paid: 250,
        due: 0,
        date: "2026-06-18",
        salesperson: "সেলসম্যান",
        createdAt: serverTimestamp()
      }
    ];

    sampleSales.forEach((sale) => {
      const sRef = doc(salesRef, sale.id);
      batch.set(sRef, {
        customerName: sale.customerName,
        customerMobile: sale.customerMobile,
        items: sale.items,
        subTotal: sale.subTotal,
        discount: sale.discount,
        total: sale.total,
        paid: sale.paid,
        due: sale.due,
        date: sale.date,
        salesperson: sale.salesperson,
        createdAt: serverTimestamp()
      });
    });

    await batch.commit();
    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding initial data: ", error);
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

