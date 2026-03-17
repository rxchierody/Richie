/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus, 
  Trash2, 
  Edit2,
  Edit3, 
  TrendingUp, 
  DollarSign,
  X,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeft,
  Shield,
  Search as SearchIcon,
  MessageCircle,
  LogOut,
  HelpCircle,
  Package,
  ShoppingCart,
  ReceiptIndianRupee,
  Calendar as CalendarIcon,
  Bell,
  AlertTriangle,
  CheckCircle,
  Activity,
  Users,
  CreditCard,
  FileText,
  Download,
  Lock,
  Key,
  Fingerprint
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  format, 
  subDays, 
  subMonths, 
  subYears, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  startOfDay,
  endOfDay,
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths,
  isToday,
  isValid
} from 'date-fns';
import { Product, Sale, Expense, ExpenseCategory, PaymentMethod, AlertRule, TriggeredAlert, AlertType, Restock, UserRole, Client, ClientTransaction, Store, UserProfile } from './types';
import { cn, formatCurrency, calculateMarkup, calculateMargin, round, EAST_AFRICAN_CURRENCIES } from './lib/utils';
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDoc,
  getDocs,
  getDocFromServer,
  writeBatch,
  Timestamp
} from 'firebase/firestore';

type Tab = 'portfolio' | 'store' | 'calendar' | 'alerts' | 'clients' | 'reports' | 'staff' | 'stores' | 'security';
type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: { children: React.ReactNode }) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      try {
        const errorData = JSON.parse(this.state.error?.message || "");
        if (errorData.error) {
          errorMessage = `System Error: ${errorData.error}`;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-lethal-black flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-lethal-gray p-8 rounded-[40px] border border-rose-500/30 space-y-6 text-center">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto text-rose-500">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">System Failure</h2>
              <p className="text-zinc-500 text-sm leading-relaxed">{errorMessage}</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-lethal-orange text-black py-4 rounded-2xl font-bold lethal-mono text-sm tracking-widest hover:scale-[1.02] transition-all"
            >
              REBOOT SYSTEM
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const StatCard = ({ 
  label, 
  value, 
  trend, 
  inverse = false, 
  highlight = "white" 
}: { 
  label: string; 
  value: string; 
  trend: number; 
  inverse?: boolean;
  highlight?: "white" | "emerald" | "rose";
}) => {
  const isPositive = trend >= 0;
  const isGood = inverse ? !isPositive : isPositive;
  
  return (
    <div className="bg-lethal-gray p-5 sm:p-6 rounded-[32px] border border-zinc-800 relative min-h-[110px] flex flex-col justify-between">
      <p className="lethal-mono text-[10px] text-zinc-500 uppercase tracking-widest">{label}</p>
      <div className="mt-2">
        <p className={cn(
          "text-3xl sm:text-4xl font-bold tracking-tight",
          highlight === "emerald" ? "text-emerald-500" : highlight === "rose" ? "text-rose-500" : "text-white"
        )}>{value}</p>
      </div>
      <div className={cn(
        "absolute bottom-5 right-6 flex items-center gap-1 lethal-mono text-[10px] font-bold",
        isGood ? "text-emerald-500" : "text-rose-500"
      )}>
        {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {Math.abs(trend).toFixed(0)}%
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [emailForm, setEmailForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('portfolio');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('daily');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | 'ALL'>('ALL');
  const [userRole, setUserRole] = useState<UserRole>('employee');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currencyCode, setCurrencyCode] = useState(() => localStorage.getItem('lethal_currency') || 'USD');
  const f = (amount: number) => formatCurrency(amount, currencyCode);

  const [appLockConfig, setAppLockConfig] = useState<{
    type: 'pin' | 'password' | null;
    value: string | null;
  }>(() => {
    const saved = localStorage.getItem('lethal_lock_config');
    return saved ? JSON.parse(saved) : { type: null, value: null };
  });
  const [isAppLocked, setIsAppLocked] = useState(() => {
    const saved = localStorage.getItem('lethal_lock_config');
    const config = saved ? JSON.parse(saved) : { type: null, value: null };
    return !!config.type;
  });
  const [lockInput, setLockInput] = useState('');
  const [lockError, setLockError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('lethal_lock_config', JSON.stringify(appLockConfig));
  }, [appLockConfig]);

  useEffect(() => {
    localStorage.setItem('lethal_currency', currencyCode);
  }, [currencyCode]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | 'ALL'>('ALL');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [restocks, setRestocks] = useState<Restock[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientTransactions, setClientTransactions] = useState<ClientTransaction[]>([]);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    targetRole: UserRole | null;
    password: '';
    error: string;
  }>({
    isOpen: false,
    targetRole: null,
    password: '',
    error: ''
  });

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isClientTransactionModalOpen, setIsClientTransactionModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  
  const [productForm, setProductForm] = useState<Partial<Product>>({ name: '', category: 'General', unit: 'pcs', stockQuantity: undefined, buyingPrice: undefined, sellingPrice: undefined });
  const [saleForm, setSaleForm] = useState<Partial<Sale>>({ date: format(new Date(), 'yyyy-MM-dd'), productId: '', quantity: undefined, discount: undefined, paymentMethod: 'Cash' });
  const [expenseForm, setExpenseForm] = useState<Partial<Expense>>({ date: format(new Date(), 'yyyy-MM-dd'), description: '', category: 'Other', amount: undefined });
  const [restockForm, setRestockForm] = useState<Partial<Restock>>({ date: format(new Date(), 'yyyy-MM-dd'), productId: '', quantity: undefined, unitCost: undefined });
  const [clientForm, setClientForm] = useState<Partial<Client>>({ name: '', phone: '', email: '', totalDebt: undefined });
  const [clientTransactionForm, setClientTransactionForm] = useState<Partial<ClientTransaction>>({ date: format(new Date(), 'yyyy-MM-dd'), type: 'CREDIT', amount: undefined, description: '', clientId: '', quantity: undefined });
  const [alertForm, setAlertForm] = useState<Partial<AlertRule>>({ name: '', type: 'LOW_STOCK', threshold: undefined, isActive: true });
  const [staffForm, setStaffForm] = useState<{ email: string; role: UserRole; displayName: string; assignedStoreIds: string[] }>({ email: '', role: 'employee', displayName: '', assignedStoreIds: [] });
  const [storeForm, setStoreForm] = useState<Partial<Store>>({ name: '', location: '' });
  
  const [reportDate, setReportDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [modalSearch, setModalSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productsSearch, setProductsSearch] = useState('');
  const [clientsSearch, setClientsSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');

  const [staff, setStaff] = useState<{ id: string; email: string; role: UserRole; displayName?: string }[]>([]);

  const getDayStats = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const daySales = sales.filter(s => s.date === dateStr);
    const dayExpenses = expenses.filter(e => e.date === dateStr);
    const dayRestocks = restocks.filter(r => r.date === dateStr);
    
    const revenue = round(daySales.reduce((acc, s) => acc + (s.quantity * s.sellingPrice - s.discount), 0));
    const expenseTotal = round(dayExpenses.reduce((acc, e) => acc + e.amount, 0));
    const restockCost = round(dayRestocks.reduce((acc, r) => acc + (r.quantity * r.unitCost), 0));
    
    // Use COGS (Cost of Goods Sold) for accurate profit calculation
    const cogs = round(daySales.reduce((acc, sale) => {
      const buyingPrice = sale.buyingPrice ?? products.find(p => p.id === sale.productId)?.buyingPrice ?? 0;
      return acc + (sale.quantity * buyingPrice);
    }, 0));
    
    const netProfit = round(revenue - expenseTotal - cogs);
    
    return { revenue, expenseTotal, restockCost, netProfit };
  };
  
  // Auth and User Profile Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Sync user profile/role
        const userDocRef = doc(db, 'users', currentUser.uid);
        const emailDocRef = doc(db, 'users', currentUser.email?.toLowerCase() || 'unknown');
        
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setUserProfile({ ...data, id: userDoc.id });
            setUserRole(data.role);
          } else {
            // Check if there's a pre-authorized role by email
            const emailDoc = await getDoc(emailDocRef);
            let role: UserRole = currentUser.email === 'richielwondo434@gmail.com' ? 'executive' : 'employee';
            let displayName = currentUser.displayName || '';
            let assignedStoreIds: string[] = [];

            if (emailDoc.exists()) {
              const data = emailDoc.data() as UserProfile;
              role = data.role;
              displayName = data.displayName || displayName;
              assignedStoreIds = data.assignedStoreIds || [];
              // Delete the temporary email-based doc
              await deleteDoc(emailDocRef);
            }

            // Create the permanent UID-based doc
            const newProfile: UserProfile = {
              id: currentUser.uid,
              email: currentUser.email || '',
              role: role,
              displayName: displayName,
              assignedStoreIds: assignedStoreIds
            };
            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
            setUserRole(role);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Real-time Sync
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const unsubStores = onSnapshot(collection(db, 'stores'), (snapshot) => {
      const storesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Store));
      setStores(storesData);
      
      // If the selected store was deleted, or if no store is selected and we have stores
      if (selectedStoreId !== 'ALL') {
        if (!storesData.find(s => s.id === selectedStoreId)) {
          setSelectedStoreId('ALL');
        }
      } else if (userRole !== 'executive' && storesData.length > 0) {
        setSelectedStoreId(storesData[0].id);
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'stores'));

    const getQuery = (colName: string) => {
      let baseQuery = collection(db, colName);
      if (selectedStoreId !== 'ALL') {
        return query(baseQuery, where('storeId', '==', selectedStoreId));
      }
      return query(baseQuery);
    };

    const unsubProducts = onSnapshot(getQuery('products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'products'));

    const unsubSales = onSnapshot(getQuery('sales'), (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Sale)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sales'));

    const unsubExpenses = onSnapshot(getQuery('expenses'), (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'expenses'));

    const unsubRestocks = onSnapshot(getQuery('restocks'), (snapshot) => {
      setRestocks(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Restock)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'restocks'));

    const unsubClients = onSnapshot(getQuery('clients'), (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Client)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'clients'));

    const unsubTransactions = onSnapshot(getQuery('clientTransactions'), (snapshot) => {
      setClientTransactions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ClientTransaction)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'clientTransactions'));

    const unsubAlerts = onSnapshot(getQuery('alertRules'), (snapshot) => {
      setAlerts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AlertRule)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'alertRules'));

    const unsubTriggered = onSnapshot(getQuery('triggeredAlerts'), (snapshot) => {
      setTriggeredAlerts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TriggeredAlert)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'triggeredAlerts'));

    const unsubStaff = onSnapshot(collection(db, 'users'), (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    return () => {
      unsubStores();
      unsubProducts();
      unsubSales();
      unsubExpenses();
      unsubRestocks();
      unsubClients();
      unsubTransactions();
      unsubAlerts();
      unsubTriggered();
      unsubStaff();
    };
  }, [isAuthReady, user, selectedStoreId, userRole]);

  // Test Connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  // Calculations
  const stats = useMemo(() => {
    const calculateStatsForPeriod = (startDate: Date, endDate: Date) => {
      const periodSales = sales.filter(s => {
        const d = parseISO(s.date);
        const matchesDate = d >= startDate && d <= endDate;
        const matchesPayment = paymentMethodFilter === 'ALL' || s.paymentMethod === paymentMethodFilter;
        return matchesDate && matchesPayment;
      });
      const periodExpenses = expenses.filter(e => {
        const d = parseISO(e.date);
        return d >= startDate && d <= endDate;
      });

      const revenue = round(periodSales.reduce((acc, sale) => acc + (sale.quantity * sale.sellingPrice - sale.discount), 0));
      const cogs = round(periodSales.reduce((acc, sale) => {
        const buyingPrice = sale.buyingPrice ?? products.find(p => p.id === sale.productId)?.buyingPrice ?? 0;
        return acc + (sale.quantity * buyingPrice);
      }, 0));
      const grossProfit = round(revenue - cogs);
      const totalExpenses = round(periodExpenses.reduce((acc, exp) => acc + exp.amount, 0));
      const netProfit = round(grossProfit - totalExpenses);
      const margin = revenue > 0 ? round((netProfit / revenue) * 100) : 0;

      return { revenue, grossProfit, totalExpenses, netProfit, margin };
    };

    const now = new Date();
    let currentStart: Date;
    let previousStart: Date;
    let previousEnd: Date;

    switch (timePeriod) {
      case 'daily':
        currentStart = startOfDay(now);
        previousStart = startOfDay(subDays(now, 1));
        previousEnd = endOfDay(subDays(now, 1));
        break;
      case 'weekly':
        currentStart = subDays(now, 7);
        previousStart = subDays(now, 14);
        previousEnd = subDays(now, 7);
        break;
      case 'monthly':
        currentStart = subMonths(now, 1);
        previousStart = subMonths(now, 2);
        previousEnd = subMonths(now, 1);
        break;
      case 'yearly':
        currentStart = subYears(now, 1);
        previousStart = subYears(now, 2);
        previousEnd = subYears(now, 1);
        break;
      default:
        currentStart = subDays(now, 7);
        previousStart = subDays(now, 14);
        previousEnd = subDays(now, 7);
    }

    const current = calculateStatsForPeriod(currentStart, now);
    const previous = calculateStatsForPeriod(previousStart, previousEnd);

    const calculateTrend = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    return {
      current,
      trends: {
        revenue: calculateTrend(current.revenue, previous.revenue),
        expenses: calculateTrend(current.totalExpenses, previous.totalExpenses),
        grossProfit: calculateTrend(current.grossProfit, previous.grossProfit),
        netProfit: calculateTrend(current.netProfit, previous.netProfit),
        margin: current.margin - previous.margin // Percentage point difference
      }
    };
  }, [sales, products, expenses, timePeriod, paymentMethodFilter]);

  // Alert Logic
  useEffect(() => {
    if (products.length === 0 && sales.length === 0) return;

    const newTriggered: TriggeredAlert[] = [];
    const now = new Date();
    const nowIso = now.toISOString();

    alerts.filter(a => a.isActive).forEach(alert => {
      if (alert.type === 'LOW_STOCK') {
        const product = products.find(p => p.id === alert.targetId);
        if (product && product.stockQuantity <= alert.threshold) {
          const alreadyTriggered = triggeredAlerts.some(ta => ta.ruleId === alert.id && ta.message.includes(product.name));
          if (!alreadyTriggered) {
            newTriggered.push({
              id: Math.random().toString(36).substr(2, 9),
              storeId: alert.storeId,
              ruleId: alert.id,
              message: `CRITICAL: ${product.name} stock reached ${product.stockQuantity} (Threshold: ${alert.threshold})`,
              timestamp: nowIso,
              isRead: false
            });
          }
        }
      } else if (alert.type === 'SALES_TARGET') {
        const totalSales = sales.reduce((acc, s) => acc + (s.quantity * s.sellingPrice - s.discount), 0);
        if (totalSales >= alert.threshold) {
          const alreadyTriggered = triggeredAlerts.some(ta => ta.ruleId === alert.id);
          if (!alreadyTriggered) {
            newTriggered.push({
              id: Math.random().toString(36).substr(2, 9),
              storeId: alert.storeId,
              ruleId: alert.id,
              message: `OBJECTIVE REACHED: Sales target of ${f(alert.threshold)} achieved! Current: ${f(totalSales)}`,
              timestamp: nowIso,
              isRead: false
            });
          }
        }
      } else if (alert.type === 'PROFIT_MARGIN') {
        if (stats.current.margin < alert.threshold && stats.current.revenue > 0) {
          const alreadyTriggered = triggeredAlerts.some(ta => ta.ruleId === alert.id && format(parseISO(ta.timestamp), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd'));
          if (!alreadyTriggered) {
            newTriggered.push({
              id: Math.random().toString(36).substr(2, 9),
              storeId: alert.storeId,
              ruleId: alert.id,
              message: `MARGIN ALERT: Current profit margin (${stats.current.margin.toFixed(1)}%) is below threshold (${alert.threshold}%)`,
              timestamp: nowIso,
              isRead: false
            });
          }
        }
      } else if (alert.type === 'SALES_VELOCITY') {
        const product = products.find(p => p.id === alert.targetId);
        if (product) {
          const last24h = subDays(now, 1);
          const productSalesLast24h = sales.filter(s => {
            const d = parseISO(s.date);
            return s.productId === product.id && d >= last24h;
          }).reduce((acc, s) => acc + s.quantity, 0);

          if (productSalesLast24h >= alert.threshold) {
            const alreadyTriggered = triggeredAlerts.some(ta => ta.ruleId === alert.id && ta.message.includes(product.name) && (now.getTime() - parseISO(ta.timestamp).getTime() < 3600000)); // Once per hour
            if (!alreadyTriggered) {
              newTriggered.push({
                id: Math.random().toString(36).substr(2, 9),
                storeId: alert.storeId,
                ruleId: alert.id,
                message: `VELOCITY ALERT: ${product.name} is selling fast! ${productSalesLast24h} units sold in last 24h.`,
                timestamp: nowIso,
                isRead: false
              });
            }
          }
        }
      }
    });

    if (newTriggered.length > 0) {
      setTriggeredAlerts(prev => [...newTriggered, ...prev]);
    }
  }, [products, sales, alerts, stats]);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), i);
      return format(date, 'yyyy-MM-dd');
    }).reverse();

    return last7Days.map(date => {
      const daySales = sales
        .filter(s => s.date === date && (paymentMethodFilter === 'ALL' || s.paymentMethod === paymentMethodFilter))
        .reduce((acc, s) => acc + (s.quantity * s.sellingPrice - s.discount), 0);
      const dayExpenses = expenses
        .filter(e => e.date === date)
        .reduce((acc, e) => acc + e.amount, 0);
      return {
        name: format(parseISO(date), 'MMM dd'),
        sales: daySales,
        expenses: dayExpenses,
      };
    });
  }, [sales, expenses, paymentMethodFilter]);

  // Handlers
  const handleAddProduct = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (!productForm.name) {
        throw new Error("Product Name is required.");
      }

      const storeId = selectedStoreId === 'ALL' ? (stores[0]?.id || '') : selectedStoreId;
      if (!storeId) throw new Error("Please select or create a store first.");

      // Remove id from payload to prevent Firestore update errors
      const { id, ...data } = productForm;
      const payload = {
        ...data,
        storeId,
        stockQuantity: productForm.stockQuantity || 0,
        buyingPrice: productForm.buyingPrice || 0,
        sellingPrice: productForm.sellingPrice || 0
      };

      if (editingProduct) {
        const docRef = doc(db, 'products', editingProduct.id);
        await updateDoc(docRef, payload);
        setEditingProduct(null);
      } else {
        const colRef = collection(db, 'products');
        const newDocRef = doc(colRef);
        await setDoc(newDocRef, payload);
      }
      setProductForm({ name: '', category: 'General', unit: 'pcs', stockQuantity: undefined, buyingPrice: undefined, sellingPrice: undefined });
      setIsProductModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingProduct ? OperationType.UPDATE : OperationType.CREATE, 'products');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSale = async () => {
    if (isSubmitting) return;
    const product = products.find(p => p.id === saleForm.productId);
    if (!product) return;
    setIsSubmitting(true);
    try {
      const storeId = selectedStoreId === 'ALL' ? (stores[0]?.id || '') : selectedStoreId;
      if (!storeId) throw new Error("Please select or create a store first.");

      const saleColRef = collection(db, 'sales');
      const newSaleDocRef = doc(saleColRef);
      const saleData = { 
        ...saleForm, 
        storeId,
        quantity: saleForm.quantity || 0,
        discount: saleForm.discount || 0,
        sellingPrice: product.sellingPrice,
        buyingPrice: product.buyingPrice,
        paymentMethod: saleForm.paymentMethod || 'Cash'
      };
      
      await setDoc(newSaleDocRef, saleData);
      
      // Update stock
      const productDocRef = doc(db, 'products', product.id);
      await updateDoc(productDocRef, { 
        stockQuantity: product.stockQuantity - (saleForm.quantity || 0) 
      });

      setSaleForm({ date: format(new Date(), 'yyyy-MM-dd'), productId: '', quantity: undefined, discount: undefined, paymentMethod: 'Cash' });
      setIsSaleModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'sales');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddExpense = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const storeId = selectedStoreId === 'ALL' ? (stores[0]?.id || '') : selectedStoreId;
      if (!storeId) throw new Error("Please select or create a store first.");

      const colRef = collection(db, 'expenses');
      const newDocRef = doc(colRef);
      await setDoc(newDocRef, { 
        ...expenseForm, 
        storeId,
        amount: expenseForm.amount || 0
      });
      setExpenseForm({ date: format(new Date(), 'yyyy-MM-dd'), description: '', category: 'Other', amount: undefined });
      setIsExpenseModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'expenses');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRestock = async () => {
    if (isSubmitting) return;
    const product = products.find(p => p.id === restockForm.productId);
    if (!product) return;
    setIsSubmitting(true);
    try {
      const storeId = selectedStoreId === 'ALL' ? (stores[0]?.id || '') : selectedStoreId;
      if (!storeId) throw new Error("Please select or create a store first.");

      const colRef = collection(db, 'restocks');
      const newDocRef = doc(colRef);
      await setDoc(newDocRef, { 
        ...restockForm, 
        storeId,
        quantity: restockForm.quantity || 0,
        unitCost: restockForm.unitCost || product.buyingPrice 
      });
      
      const productDocRef = doc(db, 'products', product.id);
      await updateDoc(productDocRef, { 
        stockQuantity: product.stockQuantity + (restockForm.quantity || 0) 
      });

      setRestockForm({ date: format(new Date(), 'yyyy-MM-dd'), productId: '', quantity: undefined, unitCost: undefined });
      setIsRestockModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'restocks');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAlert = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const storeId = selectedStoreId === 'ALL' ? (stores[0]?.id || '') : selectedStoreId;
      if (!storeId) throw new Error("Please select or create a store first.");

      const colRef = collection(db, 'alertRules');
      const newDocRef = doc(colRef);
      await setDoc(newDocRef, { 
        ...alertForm, 
        storeId,
        threshold: alertForm.threshold || 0,
        createdAt: new Date().toISOString()
      });
      setAlertForm({ name: '', type: 'LOW_STOCK', threshold: undefined, isActive: true });
      setIsAlertModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'alertRules');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddClient = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const storeId = selectedStoreId === 'ALL' ? (stores[0]?.id || '') : selectedStoreId;
      if (!storeId) throw new Error("Please select or create a store first.");

      if (editingClient) {
        const docRef = doc(db, 'clients', editingClient.id);
        await updateDoc(docRef, { 
          ...clientForm, 
          storeId,
          totalDebt: clientForm.totalDebt || 0 
        });
        setEditingClient(null);
      } else {
        const colRef = collection(db, 'clients');
        const newDocRef = doc(colRef);
        await setDoc(newDocRef, {
          ...clientForm,
          storeId,
          totalDebt: clientForm.totalDebt || 0,
          createdAt: new Date().toISOString()
        });
      }
      setClientForm({ name: '', phone: '', email: '', totalDebt: undefined });
      setIsClientModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingClient ? OperationType.UPDATE : OperationType.CREATE, 'clients');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'DELETE CLIENT',
      message: 'Are you sure you want to delete this client? This will also remove all their ledger entries.',
      onConfirm: async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
          await deleteDoc(doc(db, 'clients', clientId));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `clients/${clientId}`);
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const handleAddClientTransaction = async () => {
    if (isSubmitting) return;
    if (!selectedClient) return;
    setIsSubmitting(true);
    try {
      const storeId = selectedStoreId === 'ALL' ? (stores[0]?.id || '') : selectedStoreId;
      if (!storeId) throw new Error("Please select or create a store first.");

      const colRef = collection(db, 'clientTransactions');
      const newDocRef = doc(colRef);
      const transactionData = {
        ...clientTransactionForm,
        storeId,
        amount: clientTransactionForm.amount || 0,
        clientId: selectedClient.id
      };
      
      await setDoc(newDocRef, transactionData);
      
      // Update client debt
      const debtChange = clientTransactionForm.type === 'CREDIT' ? (clientTransactionForm.amount || 0) : -(clientTransactionForm.amount || 0);
      const clientDocRef = doc(db, 'clients', selectedClient.id);
      await updateDoc(clientDocRef, { 
        totalDebt: selectedClient.totalDebt + debtChange 
      });

      // Update product stock if linked
      if (clientTransactionForm.type === 'CREDIT' && clientTransactionForm.productId && clientTransactionForm.quantity) {
        const product = products.find(p => p.id === clientTransactionForm.productId);
        if (product) {
          const productDocRef = doc(db, 'products', product.id);
          await updateDoc(productDocRef, { 
            stockQuantity: product.stockQuantity - (clientTransactionForm.quantity || 0) 
          });
        }
      }
      
      setClientTransactionForm({
        date: format(new Date(), 'yyyy-MM-dd'), type: 'CREDIT', amount: undefined, description: '', clientId: '', quantity: undefined
      });
      setIsClientTransactionModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'clientTransactions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStaff = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingStaff) {
        const docRef = doc(db, 'users', editingStaff.id);
        await updateDoc(docRef, staffForm);
        setEditingStaff(null);
      } else {
        // Use email as ID for pre-authorized staff so they can be found on first login
        const docRef = doc(db, 'users', staffForm.email.toLowerCase());
        await setDoc(docRef, staffForm);
      }
      setStaffForm({ email: '', role: 'employee', displayName: '', assignedStoreIds: [] });
      setIsStaffModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingStaff ? OperationType.UPDATE : OperationType.CREATE, 'users');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStore = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingStore) {
        const docRef = doc(db, 'stores', editingStore.id);
        await updateDoc(docRef, storeForm);
        setEditingStore(null);
      } else {
        const colRef = collection(db, 'stores');
        const newDocRef = doc(colRef);
        await setDoc(newDocRef, { ...storeForm, createdAt: new Date().toISOString() });
      }
      setStoreForm({ name: '', location: '' });
      setIsStoreModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingStore ? OperationType.UPDATE : OperationType.CREATE, 'stores');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'DELETE STORE',
      message: 'Are you sure you want to delete this store? This will PERMANENTLY delete all products, sales, expenses, and other data associated with it.',
      onConfirm: async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
          const batch = writeBatch(db);
          
          // Delete store
          batch.delete(doc(db, 'stores', storeId));
          
          // Delete associated data
          products.filter(p => p.storeId === storeId).forEach(p => batch.delete(doc(db, 'products', p.id)));
          sales.filter(s => s.storeId === storeId).forEach(s => batch.delete(doc(db, 'sales', s.id)));
          expenses.filter(e => e.storeId === storeId).forEach(e => batch.delete(doc(db, 'expenses', e.id)));
          restocks.filter(r => r.storeId === storeId).forEach(r => batch.delete(doc(db, 'restocks', r.id)));
          clients.filter(c => c.storeId === storeId).forEach(c => batch.delete(doc(db, 'clients', c.id)));
          alerts.filter(a => a.storeId === storeId).forEach(a => batch.delete(doc(db, 'alertRules', a.id)));
          triggeredAlerts.filter(t => t.storeId === storeId).forEach(t => batch.delete(doc(db, 'triggeredAlerts', t.id)));

          await batch.commit();
          
          // Clean up assignedStoreIds in staff profiles
          const staffToUpdate = staff.filter(s => (s as any).assignedStoreIds?.includes(storeId));
          for (const s of staffToUpdate) {
            const userDocRef = doc(db, 'users', s.id);
            await updateDoc(userDocRef, {
              assignedStoreIds: (s as any).assignedStoreIds.filter((id: string) => id !== storeId)
            });
          }

          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `stores/${storeId}`);
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const handleDeleteStaff = async (staffId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'REMOVE STAFF',
      message: 'Are you sure you want to remove this staff member? They will lose all access.',
      onConfirm: async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
          await deleteDoc(doc(db, 'users', staffId));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${staffId}`);
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const handleDeleteProduct = async (productId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'DELETE PRODUCT',
      message: 'Are you sure you want to delete this product? This will remove it from the inventory permanently.',
      onConfirm: async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
          await deleteDoc(doc(db, 'products', productId));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await deleteDoc(doc(db, 'alertRules', alertId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `alertRules/${alertId}`);
    }
  };

  const handleToggleAlert = async (alert: AlertRule) => {
    try {
      const docRef = doc(db, 'alertRules', alert.id);
      await updateDoc(docRef, { isActive: !alert.isActive });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `alertRules/${alert.id}`);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const dateStr = format(parseISO(reportDate), 'MMMM dd, yyyy');
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(242, 125, 38); // Lethal Orange
    doc.text('LETHAL FINANCE', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text(`DAILY OPERATIONAL REPORT: ${dateStr}`, 105, 30, { align: 'center' });
    
    // Stats Summary
    const daySales = sales.filter(s => s.date === reportDate);
    const dayExpenses = expenses.filter(e => e.date === reportDate);
    const dayRestocks = restocks.filter(r => r.date === reportDate);
    
    const revenue = round(daySales.reduce((acc, s) => acc + (s.quantity * s.sellingPrice - s.discount), 0));
    const totalExpenses = round(dayExpenses.reduce((acc, e) => acc + e.amount, 0));
    const restockCost = round(dayRestocks.reduce((acc, r) => acc + (r.quantity * r.unitCost), 0));
    
    const cogs = round(daySales.reduce((acc, sale) => {
      const buyingPrice = sale.buyingPrice ?? products.find(p => p.id === sale.productId)?.buyingPrice ?? 0;
      return acc + (sale.quantity * buyingPrice);
    }, 0));
    
    const netProfit = round(revenue - totalExpenses - cogs);

    const statsBody = [
      ['Total Revenue', f(revenue)],
      ['Operational Expenses', f(totalExpenses)],
      ['Restock Investment', f(restockCost)],
    ];

    if (userRole === 'executive') {
      statsBody.push(['Net Daily Profit', f(netProfit)]);
    }

    autoTable(doc, {
      startY: 40,
      head: [['Metric', 'Value']],
      body: statsBody,
      theme: 'striped',
      headStyles: { fillColor: [242, 125, 38] }
    });

    // Sales Table
    if (daySales.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('SALES LOG', 14, (doc as any).lastAutoTable.finalY + 10);
      
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [['Product', 'Qty', 'Price', 'Discount', 'Total']],
        body: daySales.map(s => {
          const product = products.find(p => p.id === s.productId);
          return [
            product?.name || 'Unknown',
            s.quantity,
            f(s.sellingPrice),
            f(s.discount),
            f(s.quantity * s.sellingPrice - s.discount)
          ];
        }),
      });
    }

    // Expenses Table
    if (dayExpenses.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('EXPENSE LOG', 14, (doc as any).lastAutoTable.finalY + 10);
      
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [['Description', 'Category', 'Amount']],
        body: dayExpenses.map(e => [
          e.description,
          e.category,
          f(e.amount)
        ]),
      });
    }

    doc.save(`Lethal_Report_${reportDate}.pdf`);
  };

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        console.error("Login failed:", error);
        setLoginError("GOOGLE SIGN-IN FAILED");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    if (!emailForm.email || !emailForm.password) {
      setLoginError("EMAIL AND PASSWORD REQUIRED");
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, emailForm.email, emailForm.password);
      } else {
        await createUserWithEmailAndPassword(auth, emailForm.email, emailForm.password);
      }
    } catch (error: any) {
      console.error("Email auth failed:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setLoginError("INVALID EMAIL OR PASSWORD");
      } else if (error.code === 'auth/email-already-in-use') {
        setLoginError("EMAIL ALREADY REGISTERED");
      } else if (error.code === 'auth/weak-password') {
        setLoginError("PASSWORD TOO WEAK (MIN 6 CHARS)");
      } else {
        setLoginError("AUTHENTICATION FAILED");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      try {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': () => {
            // reCAPTCHA solved
          }
        });
      } catch (error) {
        console.error("Recaptcha init failed:", error);
      }
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    if (!phoneNumber) {
      setLoginError("PHONE NUMBER REQUIRED");
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(result);
    } catch (error: any) {
      console.error("SMS send failed:", error);
      setLoginError("FAILED TO SEND SMS. USE FORMAT: +254...");
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn || !confirmationResult) return;
    if (!verificationCode) {
      setLoginError("VERIFICATION CODE REQUIRED");
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await confirmationResult.confirm(verificationCode);
    } catch (error: any) {
      console.error("Verification failed:", error);
      setLoginError("INVALID VERIFICATION CODE");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleUnlock = () => {
    if (lockInput === appLockConfig.value) {
      setIsAppLocked(false);
      setLockInput('');
      setLockError(null);
    } else {
      setLockError('INVALID ' + (appLockConfig.type === 'pin' ? 'PIN' : 'PASSWORD'));
      setLockInput('');
    }
  };

  const handleRoleSwitch = async (targetRole: UserRole) => {
    if (userRole === targetRole) return;
    
    if (targetRole === 'executive') {
      setAuthModal({
        isOpen: true,
        targetRole: 'executive',
        password: '',
        error: ''
      });
    } else {
      try {
        if (user) {
          await updateDoc(doc(db, 'users', user.uid), { role: 'employee' });
          setUserRole('employee');
        }
      } catch (error) {
        console.error("Failed to switch role:", error);
      }
    }
  };

  const handleAuthSubmit = async () => {
    if (isSubmitting) return;
    const executivePassword = (import.meta as any).env.VITE_EXECUTIVE_PASSWORD || 'admin123'; // Fallback for demo
    
    if (authModal.password === executivePassword) {
      setIsSubmitting(true);
      try {
        if (user) {
          await updateDoc(doc(db, 'users', user.uid), { role: 'executive' });
          setUserRole('executive');
          setAuthModal(prev => ({ ...prev, isOpen: false }));
        }
      } catch (error) {
        setAuthModal(prev => ({ ...prev, error: 'FAILED TO UPDATE ROLE' }));
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setAuthModal(prev => ({ ...prev, error: 'INVALID PASSWORD' }));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveTab('portfolio');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-lethal-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-lethal-orange border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="lethal-mono text-zinc-500 text-xs tracking-widest uppercase">Initializing Intelligence Systems...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-lethal-black flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-12 text-center">
          <div className="space-y-4">
            <h1 className="text-6xl sm:text-8xl lethal-title font-bold text-white">Lethal<br />Finance</h1>
            <p className="lethal-mono text-zinc-500 text-xs tracking-[0.3em] uppercase">Secure Operational Intelligence</p>
          </div>
          
          <div className="bg-lethal-gray p-8 rounded-[40px] border border-zinc-800 space-y-8">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-lethal-orange">
              <Shield size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">{authMode === 'login' ? 'Access Restricted' : 'Create Account'}</h2>
              <p className="text-zinc-500 text-sm">Please authenticate to access the operational dashboard.</p>
            </div>

            <div className="flex bg-zinc-900 rounded-2xl p-1 border border-zinc-800">
              <button 
                onClick={() => { setAuthMethod('email'); setLoginError(null); }}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] lethal-mono transition-all",
                  authMethod === 'email' ? "bg-zinc-800 text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                EMAIL
              </button>
              <button 
                onClick={() => { setAuthMethod('phone'); setLoginError(null); }}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] lethal-mono transition-all",
                  authMethod === 'phone' ? "bg-zinc-800 text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                PHONE
              </button>
            </div>

            {authMethod === 'email' ? (
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-2 text-left">
                  <label className="text-[10px] lethal-mono text-zinc-500 ml-2 uppercase">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="EMAIL@EXAMPLE.COM" 
                    value={emailForm.email}
                    onChange={e => setEmailForm({ ...emailForm, email: e.target.value })}
                    className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none transition-all"
                  />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-[10px] lethal-mono text-zinc-500 ml-2 uppercase">Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={emailForm.password}
                    onChange={e => setEmailForm({ ...emailForm, password: e.target.value })}
                    className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none transition-all"
                  />
                </div>

                {loginError && (
                  <p className="text-rose-500 text-[10px] lethal-mono uppercase text-center animate-pulse">
                    {loginError}
                  </p>
                )}

                <button 
                  type="submit"
                  disabled={isLoggingIn}
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold lethal-mono text-sm tracking-widest transition-all",
                    isLoggingIn ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "lethal-pill-active"
                  )}
                >
                  {isLoggingIn ? 'PROCESSING...' : authMode === 'login' ? 'SIGN IN' : 'REGISTER'}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                {!confirmationResult ? (
                  <form onSubmit={handleSendCode} className="space-y-4">
                    <div className="space-y-2 text-left">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2 uppercase">Phone Number</label>
                      <input 
                        type="tel" 
                        placeholder="+254 700 000 000" 
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none transition-all"
                      />
                    </div>
                    {loginError && (
                      <p className="text-rose-500 text-[10px] lethal-mono uppercase text-center animate-pulse">
                        {loginError}
                      </p>
                    )}
                    <div id="recaptcha-container"></div>
                    <button 
                      type="submit"
                      disabled={isLoggingIn}
                      className={cn(
                        "w-full py-4 rounded-2xl font-bold lethal-mono text-sm tracking-widest transition-all",
                        isLoggingIn ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "lethal-pill-active"
                      )}
                    >
                      {isLoggingIn ? 'SENDING...' : 'SEND SMS CODE'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <div className="space-y-2 text-left">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2 uppercase">Verification Code</label>
                      <input 
                        type="text" 
                        placeholder="123456" 
                        value={verificationCode}
                        onChange={e => setVerificationCode(e.target.value)}
                        className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none transition-all"
                      />
                    </div>
                    {loginError && (
                      <p className="text-rose-500 text-[10px] lethal-mono uppercase text-center animate-pulse">
                        {loginError}
                      </p>
                    )}
                    <button 
                      type="submit"
                      disabled={isLoggingIn}
                      className={cn(
                        "w-full py-4 rounded-2xl font-bold lethal-mono text-sm tracking-widest transition-all",
                        isLoggingIn ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "lethal-pill-active"
                      )}
                    >
                      {isLoggingIn ? 'VERIFYING...' : 'VERIFY CODE'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setConfirmationResult(null)}
                      className="w-full text-[10px] lethal-mono text-zinc-500 uppercase tracking-widest hover:text-white transition-all"
                    >
                      Change Number
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="text-[8px] lethal-mono text-zinc-600 uppercase">OR</span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>

            <button 
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full bg-zinc-800 text-white py-4 rounded-2xl font-bold lethal-mono text-[10px] tracking-widest hover:bg-zinc-700 transition-all flex items-center justify-center gap-3"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
              CONTINUE WITH GOOGLE
            </button>

            <div className="pt-2">
              <button 
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className="text-[10px] lethal-mono text-lethal-orange uppercase tracking-widest hover:underline"
              >
                {authMode === 'login' ? "Don't have an account? Register" : "Already have an account? Sign In"}
              </button>
            </div>
          </div>
          
          <p className="text-[10px] lethal-mono text-zinc-700 uppercase tracking-widest">
            Authorized Personnel Only • Encrypted Session
          </p>
        </div>
      </div>
    );
  }

  if (isAppLocked && appLockConfig.type) {
    return (
      <div className="min-h-screen bg-lethal-black flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-12 text-center">
          <div className="space-y-4">
            <h1 className="text-6xl sm:text-8xl lethal-title font-bold text-white">Lethal<br />Finance</h1>
            <p className="lethal-mono text-zinc-500 text-xs tracking-[0.3em] uppercase">System Locked</p>
          </div>
          
          <div className="bg-lethal-gray p-8 rounded-[40px] border border-zinc-800 space-y-8">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-lethal-orange">
              <Lock size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Enter {appLockConfig.type === 'pin' ? 'PIN' : 'Password'}</h2>
              <p className="text-zinc-500 text-sm">Unlock your session to continue.</p>
            </div>

            <div className="space-y-4">
              <input 
                type={appLockConfig.type === 'pin' ? 'number' : 'password'}
                placeholder={appLockConfig.type === 'pin' ? '••••' : 'PASSWORD'}
                value={lockInput}
                onChange={e => setLockInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-center text-2xl tracking-[0.5em] focus:border-lethal-orange outline-none transition-all"
                autoFocus
              />
              {lockError && <p className="text-rose-500 text-[10px] lethal-mono uppercase">{lockError}</p>}
              <button 
                onClick={handleUnlock}
                className="w-full bg-lethal-orange text-black py-4 rounded-2xl font-bold lethal-mono text-sm tracking-widest hover:scale-[1.02] transition-all"
              >
                UNLOCK
              </button>
            </div>
            
            <button 
              onClick={handleLogout}
              className="text-[10px] lethal-mono text-zinc-500 uppercase tracking-widest hover:text-white transition-all"
            >
              Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lethal-black text-zinc-100 p-6 md:p-12 max-w-2xl mx-auto pb-32">
      {/* Header */}
      <header className="mb-12">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-4xl sm:text-6xl lethal-title font-bold">Lethal<br />Finance</h1>
          <div className="flex gap-4 items-start">
            <div className="flex flex-col gap-2">
              {stores.length > 0 && (
                <div className="relative">
                  <select 
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-[8px] lethal-mono text-zinc-300 focus:outline-none focus:border-lethal-orange transition-all appearance-none cursor-pointer pr-8"
                  >
                    {userRole === 'executive' && <option value="ALL">ALL STORES</option>}
                    {stores
                      .filter(s => userRole === 'executive' || userProfile?.assignedStoreIds?.includes(s.id))
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                      ))
                    }
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" size={10} />
                </div>
              )}
              <div className="flex bg-zinc-900 rounded-full p-1 border border-zinc-800">
                <button 
                  onClick={() => handleRoleSwitch('employee')}
                  className={cn(
                    "px-3 py-1 rounded-full text-[8px] lethal-mono transition-all",
                    userRole === 'employee' ? "bg-zinc-700 text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  EMPLOYEE
                </button>
                <button 
                  onClick={() => handleRoleSwitch('executive')}
                  className={cn(
                    "px-3 py-1 rounded-full text-[8px] lethal-mono transition-all",
                    userRole === 'executive' ? "bg-lethal-orange text-black font-bold" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  EXECUTIVE
                </button>
              </div>
              <select 
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1 text-[8px] lethal-mono text-zinc-300 focus:outline-none focus:border-lethal-orange transition-all appearance-none cursor-pointer text-center"
              >
                {EAST_AFRICAN_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <button 
                onClick={() => setActiveTab('alerts')}
                className={cn(
                  "w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center transition-all",
                  triggeredAlerts.some(a => !a.isRead) ? "text-lethal-orange border-lethal-orange animate-pulse" : "text-zinc-500 hover:text-white hover:border-zinc-600"
                )}
              >
                <Bell size={24} />
              </button>
              {triggeredAlerts.some(a => !a.isRead) && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-lethal-orange rounded-full border-2 border-lethal-black" />
              )}
            </div>
            <button 
              onClick={handleLogout}
              className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-lethal-orange hover:border-lethal-orange transition-all"
            >
              <LogOut size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-lethal-gray rounded-2xl p-1.5 flex mb-12 border border-zinc-800/50 gap-2 overflow-x-auto no-scrollbar items-center">
        {[
          { id: 'portfolio', label: 'PORTFOLIO' },
          { id: 'store', label: 'STORE' },
          { id: 'clients', label: 'CLIENTS' },
          { id: 'calendar', label: 'CALENDAR' },
          { id: 'reports', label: 'REPORTS' },
          { id: 'alerts', label: 'ALERTS' },
          { id: 'staff', label: 'STAFF' },
          { id: 'stores', label: 'STORES' },
          { id: 'security', label: 'SECURITY' },
        ].filter(tab => userRole === 'executive' || (tab.id !== 'alerts' && tab.id !== 'staff' && tab.id !== 'stores')).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={cn(
              "flex-shrink-0 py-2 rounded-xl text-[9px] sm:text-[10px] font-bold lethal-mono transition-all duration-300 whitespace-nowrap px-3 sm:px-4",
              activeTab === tab.id 
                ? "lethal-pill-active" 
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'portfolio' && (
          <motion.div
            key="portfolio"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold lethal-title">
                  {timePeriod === 'daily' ? "Today's Overview" : "Portfolio Overview"}
                </h2>
                <p className="lethal-mono text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                  {timePeriod === 'daily' ? format(new Date(), 'MMMM dd, yyyy') : 'Aggregate Performance'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none">
                  <select 
                    value={timePeriod}
                    onChange={(e) => setTimePeriod(e.target.value as any)}
                    className="w-full bg-lethal-gray border border-zinc-800 rounded-2xl px-4 py-2 text-[10px] lethal-mono font-bold text-zinc-400 focus:text-white focus:border-lethal-orange outline-none appearance-none cursor-pointer transition-all uppercase pr-8"
                  >
                    <option value="daily">TODAY</option>
                    <option value="weekly">LAST 7 DAYS</option>
                    <option value="monthly">LAST 30 DAYS</option>
                    <option value="yearly">LAST YEAR</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" size={12} />
                </div>
                <div className="relative flex-1 md:flex-none">
                  <select 
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value as any)}
                    className="w-full bg-lethal-gray border border-zinc-800 rounded-2xl px-4 py-2 text-[10px] lethal-mono font-bold text-zinc-400 focus:text-white focus:border-lethal-orange outline-none appearance-none cursor-pointer transition-all uppercase pr-8"
                  >
                    <option value="ALL">ALL PAYMENTS</option>
                    <option value="Cash">CASH</option>
                    <option value="Credit">CREDIT</option>
                    <option value="Mobile Money Transfer">MOBILE MONEY</option>
                    <option value="Cheque">CHEQUE</option>
                    <option value="Bank">BANK</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" size={12} />
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 gap-4">
              <StatCard 
                label="Revenue" 
                value={f(stats.current.revenue)} 
                trend={stats.trends.revenue}
              />
              <StatCard 
                label="Expenses" 
                value={f(stats.current.totalExpenses)} 
                trend={stats.trends.expenses}
                inverse
              />
              {userRole === 'executive' && (
                <>
                  <StatCard 
                    label="Gross Profit" 
                    value={f(stats.current.grossProfit)} 
                    trend={stats.trends.grossProfit}
                  />
                  <StatCard 
                    label="Net Profit" 
                    value={f(stats.current.netProfit)} 
                    trend={stats.trends.netProfit}
                    highlight={stats.current.netProfit >= 0 ? "emerald" : "rose"}
                  />
                  <div className="bg-lethal-gray p-5 sm:p-6 rounded-[32px] border border-zinc-800 relative min-h-[110px] flex flex-col justify-between">
                    <p className="lethal-mono text-[10px] text-zinc-500 uppercase tracking-widest">Profit Margin</p>
                    <div className="mt-2">
                      <p className="text-3xl sm:text-4xl font-bold tracking-tight text-white">{stats.current.margin.toFixed(1)}%</p>
                    </div>
                    <div className={cn(
                      "absolute bottom-5 right-6 flex items-center gap-1 lethal-mono text-[10px] font-bold",
                      stats.trends.margin >= 0 ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {stats.trends.margin >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {Math.abs(stats.trends.margin).toFixed(1)}%
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Weekly Performance Chart */}
            <div className="bg-lethal-gray border border-zinc-800 p-6 rounded-3xl space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="lethal-mono text-xs font-bold text-lethal-orange tracking-widest uppercase">Last 7 Days</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-lethal-orange" />
                    <span className="text-[8px] lethal-mono text-zinc-500 uppercase">Sales</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-600" />
                    <span className="text-[8px] lethal-mono text-zinc-500 uppercase">Expenses</span>
                  </div>
                </div>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#333" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      dy={10}
                    />
                    <YAxis 
                      stroke="#333" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ 
                        backgroundColor: '#050505', 
                        border: '1px solid #333', 
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontFamily: 'JetBrains Mono'
                      }} 
                      itemStyle={{ padding: '2px 0' }}
                    />
                    <Bar dataKey="sales" fill="#F27D26" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="expenses" fill="#333" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4 mt-8">
              <div className="flex justify-between items-center">
                <h3 className="lethal-mono text-xs font-bold text-zinc-500">RECENT LOGS</h3>
                <div className="flex gap-2">
                  <button onClick={() => setIsSaleModalOpen(true)} className="text-[10px] lethal-mono text-lethal-orange border border-lethal-orange/30 px-3 py-1 rounded-full hover:bg-lethal-orange/10 transition-all">ADD SALE</button>
                  <button onClick={() => setIsExpenseModalOpen(true)} className="text-[10px] lethal-mono text-zinc-500 border border-zinc-800 px-3 py-1 rounded-full hover:bg-white/5 transition-all">ADD EXPENSE</button>
                </div>
              </div>
              
              {[...sales, ...expenses, ...restocks]
                .filter(item => {
                  if ('productId' in item && 'sellingPrice' in item) {
                    return paymentMethodFilter === 'ALL' || (item as Sale).paymentMethod === paymentMethodFilter;
                  }
                  return true;
                })
                .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
                .slice(0, 10)
                .map((item, i) => {
                  const isSale = 'productId' in item && 'sellingPrice' in item;
                  const isRestock = 'productId' in item && 'unitCost' in item;
                  
                  return (
                    <div key={i} className="flex justify-between items-center py-4 border-b border-zinc-800/50">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-2 rounded-lg", 
                          isSale ? "bg-lethal-orange/10 text-lethal-orange" : 
                          isRestock ? "bg-emerald-500/10 text-emerald-500" : 
                          "bg-zinc-800 text-zinc-400"
                        )}>
                          {isSale ? <ShoppingCart size={16} /> : 
                           isRestock ? <Package size={16} /> : 
                           <ReceiptIndianRupee size={16} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">
                            {isSale || isRestock ? products.find(p => p.id === item.productId)?.name : (item as Expense).description}
                          </p>
                          <p className="lethal-mono text-[8px] text-zinc-600">
                            {format(parseISO(item.date), 'MMM dd, yyyy')}
                            {isSale && (
                              <>
                                <span className="ml-2">• QTY: {item.quantity}</span>
                                <span className="ml-2 text-lethal-orange/60">• {(item as Sale).paymentMethod?.toUpperCase()}</span>
                                {item.discount > 0 && <span className="ml-2 text-rose-500/80">• DISC: {f(item.discount)}</span>}
                              </>
                            )}
                            {isRestock && (
                              <>
                                <span className="ml-2 text-emerald-500/80">• RESTOCK QTY: {item.quantity}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <p className={cn(
                        "font-bold", 
                        isSale ? "text-lethal-orange" : 
                        isRestock ? "text-emerald-500" : 
                        "text-zinc-500"
                      )}>
                        {isSale ? f(item.quantity * item.sellingPrice - item.discount) : 
                         isRestock ? `+${item.quantity}` : 
                         f((item as Expense).amount)}
                      </p>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        )}

        {activeTab === 'store' && (
          <motion.div
            key="store"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {!selectedProductId ? (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold lethal-title">Stock Store</h2>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setRestockForm({ date: format(new Date(), 'yyyy-MM-dd'), productId: '', quantity: 0, unitCost: 0 });
                        setModalSearch('');
                        setIsRestockModalOpen(true);
                      }}
                      className="text-[10px] lethal-mono text-emerald-500 border border-emerald-500/30 px-4 py-2 rounded-full hover:bg-emerald-500/10 transition-all flex items-center gap-2"
                    >
                      <Package size={14} /> RESTOCK
                    </button>
                    <button 
                      onClick={() => setIsProductModalOpen(true)}
                      className="w-10 h-10 rounded-full lethal-pill-active flex items-center justify-center"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input 
                    type="text"
                    placeholder="SEARCH STOCK..."
                    value={productsSearch}
                    onChange={(e) => setProductsSearch(e.target.value)}
                    className="w-full bg-lethal-gray border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-xs lethal-mono focus:border-lethal-orange outline-none transition-all"
                  />
                </div>

                <div className="space-y-4">
                  {products
                    .filter(p => p.name.toLowerCase().includes(productsSearch.toLowerCase()))
                    .map(product => {
                      const productSales = sales.filter(s => s.productId === product.id);
                      const totalProfit = productSales.reduce((acc, sale) => {
                        const revenue = (sale.quantity * sale.sellingPrice) - sale.discount;
                        const cost = sale.quantity * product.buyingPrice;
                        return acc + (revenue - cost);
                      }, 0);

                      return (
                        <div 
                          key={product.id} 
                          onClick={() => setSelectedProductId(product.id)}
                          className="bg-lethal-gray border border-zinc-800 p-6 rounded-3xl flex justify-between items-center group cursor-pointer hover:border-lethal-orange/50 transition-all"
                        >
                          <div>
                            <h4 className="font-bold text-white mb-1">{product.name}</h4>
                            <p className="lethal-mono text-[10px] text-zinc-500">{product.stockQuantity} {product.unit} REMAINING</p>
                            {userRole === 'executive' && (
                              <p className="lethal-mono text-[9px] text-emerald-500 mt-2">TOTAL PROFIT: {f(totalProfit)}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {userRole === 'executive' && (
                                <span className="text-[10px] lethal-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                                  {calculateMargin(product.buyingPrice, product.sellingPrice).toFixed(1)}%
                                </span>
                              )}
                              <p className="text-lethal-orange font-bold">{f(product.sellingPrice)}</p>
                            </div>
                            <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); setEditingProduct(product); setProductForm(product); setIsProductModalOpen(true); }} className="text-zinc-500 hover:text-white"><Edit3 size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }} className="text-zinc-500 hover:text-rose-500"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            ) : (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <button 
                    onClick={() => setSelectedProductId(null)}
                    className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors lethal-mono text-[10px] font-bold"
                  >
                    <ArrowLeft size={16} /> BACK TO STORE
                  </button>
                  <button 
                    onClick={() => {
                      const product = products.find(p => p.id === selectedProductId);
                      if (product) {
                        setRestockForm({ ...restockForm, productId: product.id, unitCost: product.buyingPrice });
                        setModalSearch('');
                        setIsRestockModalOpen(true);
                      }
                    }}
                    className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 transition-colors lethal-mono text-[10px] font-bold border border-emerald-500/30 px-4 py-2 rounded-full"
                  >
                    <Package size={14} /> RESTOCK UNIT
                  </button>
                </div>

                {(() => {
                  const product = products.find(p => p.id === selectedProductId);
                  if (!product) return null;
                  const productSales = sales.filter(s => s.productId === product.id);
                  const totalProfit = productSales.reduce((acc, sale) => {
                    const revenue = (sale.quantity * sale.sellingPrice) - sale.discount;
                    const cost = sale.quantity * product.buyingPrice;
                    return acc + (revenue - cost);
                  }, 0);

                  return (
                    <>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                        <div>
                          <h2 className="text-2xl sm:text-4xl font-bold lethal-title mb-2">{product.name}</h2>
                          <p className="lethal-mono text-[10px] sm:text-xs text-zinc-500">{product.category}</p>
                        </div>
                        {userRole === 'executive' && (
                          <div className="text-left sm:text-right">
                            <p className="lethal-mono text-[10px] text-zinc-500 mb-1 uppercase">Total Profit</p>
                            <p className="text-2xl sm:text-3xl font-bold text-emerald-500 break-all">{f(totalProfit)}</p>
                          </div>
                        )}
                      </div>

                      <div className={cn("grid gap-4", userRole === 'executive' ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
                        <div className="bg-lethal-gray p-4 sm:p-6 rounded-3xl border border-zinc-800">
                          <p className="lethal-mono text-[10px] text-zinc-500 mb-2 uppercase">Stock</p>
                          <p className="text-lg sm:text-xl font-bold text-white break-all">{product.stockQuantity} {product.unit}</p>
                        </div>
                        {userRole === 'executive' && (
                          <div className="bg-lethal-gray p-4 sm:p-6 rounded-3xl border border-zinc-800">
                            <p className="lethal-mono text-[10px] text-zinc-500 mb-2 uppercase">Buying Price</p>
                            <p className="text-lg sm:text-xl font-bold text-white break-all">{f(product.buyingPrice)}</p>
                          </div>
                        )}
                        <div className="bg-lethal-gray p-4 sm:p-6 rounded-3xl border border-zinc-800">
                          <p className="lethal-mono text-[10px] text-zinc-500 mb-2 uppercase">Selling Price</p>
                          <p className="text-lg sm:text-xl font-bold text-lethal-orange break-all">{f(product.sellingPrice)}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="lethal-mono text-xs font-bold text-zinc-500 uppercase tracking-widest">Sales History</h3>
                        {productSales.length > 0 ? (
                          <div className="space-y-2">
                            {productSales
                              .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
                              .map((sale) => {
                                const buyingPrice = sale.buyingPrice ?? product.buyingPrice;
                                const profit = round((sale.quantity * sale.sellingPrice) - sale.discount - (sale.quantity * buyingPrice));
                                return (
                                  <div key={sale.id} className="bg-lethal-gray/50 border border-zinc-800/50 p-4 rounded-2xl flex justify-between items-center">
                                    <div>
                                      <p className="text-sm font-bold text-white">QTY: {sale.quantity}</p>
                                      <p className="lethal-mono text-[9px] text-zinc-500">{format(parseISO(sale.date), 'MMM dd, yyyy')}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-bold text-lethal-orange">{f((sale.quantity * sale.sellingPrice) - sale.discount)}</p>
                                      {userRole === 'executive' && (
                                        <p className="lethal-mono text-[9px] text-emerald-500">PROFIT: {f(profit)}</p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="bg-lethal-gray/30 border border-dashed border-zinc-800 p-8 rounded-3xl text-center">
                            <p className="lethal-mono text-[10px] text-zinc-600">NO SALES RECORDED FOR THIS UNIT</p>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'calendar' && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold lethal-title">Financial Timeline</h2>
              <div className="flex items-center gap-4 bg-lethal-gray p-1 rounded-xl border border-zinc-800">
                <button 
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="lethal-mono text-[10px] font-bold px-2 min-w-[120px] text-center uppercase tracking-widest">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <button 
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="bg-lethal-gray border border-zinc-800 rounded-3xl overflow-hidden">
              <div className="grid grid-cols-7 border-b border-zinc-800">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="py-3 text-center lethal-mono text-[8px] font-bold text-zinc-600 uppercase tracking-widest">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {(() => {
                  const monthStart = startOfMonth(currentMonth);
                  const monthEnd = endOfMonth(monthStart);
                  const startDate = startOfWeek(monthStart);
                  const endDate = endOfWeek(monthEnd);
                  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

                  return calendarDays.map((day, i) => {
                    const stats = getDayStats(day);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isTodayDate = isToday(day);

                    return (
                      <button
                        key={day.toString()}
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          "min-h-[80px] p-2 border-r border-b border-zinc-800/50 flex flex-col items-start transition-all relative group",
                          !isCurrentMonth && "opacity-20",
                          isSelected ? "bg-lethal-orange/10" : "hover:bg-white/5",
                          i % 7 === 6 && "border-r-0"
                        )}
                      >
                        <span className={cn(
                          "text-[10px] lethal-mono font-bold mb-1",
                          isTodayDate ? "text-lethal-orange" : isSelected ? "text-white" : "text-zinc-500"
                        )}>
                          {format(day, 'd')}
                        </span>
                        
                        <div className="mt-auto w-full space-y-1">
                          {stats.revenue > 0 && (
                            <div className="space-y-0.5">
                              <div className="h-1 w-full bg-lethal-orange/20 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-lethal-orange" 
                                  style={{ width: `${Math.min((stats.revenue / 1000) * 100, 100)}%` }}
                                />
                              </div>
                              <p className="text-[7px] lethal-mono text-lethal-orange font-bold">
                                {f(stats.revenue)}
                              </p>
                            </div>
                          )}
                          {stats.restockCost > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                              <p className="text-[6px] lethal-mono text-emerald-500 font-bold uppercase">Restocked</p>
                            </div>
                          )}
                        </div>
                        
                        {isSelected && (
                          <motion.div 
                            layoutId="calendar-select"
                            className="absolute inset-0 border-2 border-lethal-orange rounded-sm pointer-events-none"
                          />
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h3 className="lethal-mono text-xs font-bold text-lethal-orange tracking-widest uppercase">
                    LOGS FOR {format(selectedDate, 'MMMM dd, yyyy')}
                  </h3>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <p className="text-[8px] lethal-mono text-zinc-500 uppercase">Daily Revenue</p>
                      <p className="text-sm font-bold text-white">{f(getDayStats(selectedDate).revenue)}</p>
                    </div>
                    {userRole === 'executive' && (
                      <div className="text-right">
                        <p className="text-[8px] lethal-mono text-zinc-500 uppercase">Net Profit</p>
                        <p className={cn(
                          "text-sm font-bold",
                          getDayStats(selectedDate).netProfit >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {f(getDayStats(selectedDate).netProfit)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-lethal-gray border border-zinc-800 p-6 rounded-3xl space-y-4">
                    <h4 className="lethal-mono text-[10px] font-bold text-zinc-500 uppercase tracking-widest">TRANSACTIONS</h4>
                    {sales.filter(s => s.date === format(selectedDate, 'yyyy-MM-dd')).length > 0 ? (
                      <div className="space-y-3">
                        {sales.filter(s => s.date === format(selectedDate, 'yyyy-MM-dd')).map(sale => {
                          const product = products.find(p => p.id === sale.productId);
                          return (
                            <div key={sale.id} className="flex justify-between items-center py-2 border-b border-zinc-800/50 last:border-0">
                              <div>
                                <p className="text-xs font-bold text-white">{product?.name || 'Unknown'}</p>
                                <p className="text-[8px] lethal-mono text-zinc-600">QTY: {sale.quantity} • {sale.paymentMethod?.toUpperCase()} • {f(sale.sellingPrice)}/ea</p>
                              </div>
                              <p className="text-xs font-bold text-lethal-orange">{f(sale.quantity * sale.sellingPrice - sale.discount)}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] lethal-mono text-zinc-700 text-center py-4 italic">NO SALES RECORDED</p>
                    )}
                  </div>

                  <div className="bg-lethal-gray border border-zinc-800 p-6 rounded-3xl space-y-4">
                    <h4 className="lethal-mono text-[10px] font-bold text-zinc-500 uppercase tracking-widest">EXPENDITURES</h4>
                    {expenses.filter(e => e.date === format(selectedDate, 'yyyy-MM-dd')).length > 0 ? (
                      <div className="space-y-3">
                        {expenses.filter(e => e.date === format(selectedDate, 'yyyy-MM-dd')).map(expense => (
                          <div key={expense.id} className="flex justify-between items-center py-2 border-b border-zinc-800/50 last:border-0">
                            <div>
                              <p className="text-xs font-bold text-white">{expense.description}</p>
                              <p className="text-[8px] lethal-mono text-zinc-600 uppercase">{expense.category}</p>
                            </div>
                            <p className="text-xs font-bold text-zinc-400">{f(expense.amount)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] lethal-mono text-zinc-700 text-center py-4 italic">NO EXPENSES RECORDED</p>
                    )}
                  </div>

                  <div className="bg-lethal-gray border border-zinc-800 p-6 rounded-3xl space-y-4 md:col-span-2">
                    <h4 className="lethal-mono text-[10px] font-bold text-emerald-500 uppercase tracking-widest">INVENTORY RESTOCKS</h4>
                    {restocks.filter(r => r.date === format(selectedDate, 'yyyy-MM-dd')).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {restocks.filter(r => r.date === format(selectedDate, 'yyyy-MM-dd')).map(restock => {
                          const product = products.find(p => p.id === restock.productId);
                          return (
                            <div key={restock.id} className="flex justify-between items-center py-3 px-4 bg-lethal-black/40 rounded-2xl border border-zinc-800/50">
                              <div>
                                <p className="text-xs font-bold text-white">{product?.name || 'Unknown'}</p>
                                <p className="text-[8px] lethal-mono text-emerald-500 uppercase">ADDED {restock.quantity} {product?.unit || 'units'}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold text-zinc-400">{f(restock.quantity * restock.unitCost)}</p>
                                <p className="text-[8px] lethal-mono text-zinc-600 uppercase">COST: {f(restock.unitCost)}/ea</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] lethal-mono text-zinc-700 text-center py-4 italic">NO RESTOCKS RECORDED</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === 'clients' && (
          <motion.div
            key="clients"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold lethal-title">Client Ledger</h2>
              <button 
                onClick={() => {
                  setEditingClient(null);
                  setClientForm({ name: '', phone: '', email: '', totalDebt: undefined });
                  setIsClientModalOpen(true);
                }}
                className="w-10 h-10 rounded-full lethal-pill-active flex items-center justify-center"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="SEARCH CLIENTS..." 
                value={clientsSearch}
                onChange={e => setClientsSearch(e.target.value)}
                className="w-full bg-lethal-gray border border-zinc-800 rounded-3xl pl-12 pr-6 py-4 text-sm focus:border-lethal-orange outline-none transition-all"
              />
            </div>

            <div className="space-y-4">
              {clients
                .filter(c => c.name.toLowerCase().includes(clientsSearch.toLowerCase()) || c.phone.includes(clientsSearch))
                .map(client => (
                  <div key={client.id} className="bg-lethal-gray border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-all">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                          <Users size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">{client.name}</h3>
                          <p className="lethal-mono text-[9px] text-zinc-500 uppercase">{client.phone}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="lethal-mono text-[8px] text-zinc-500 uppercase mb-1">Outstanding Debt</p>
                        <p className={cn("text-xl font-bold", client.totalDebt > 0 ? "text-rose-500" : "text-emerald-500")}>
                          {f(client.totalDebt)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mb-6">
                      <button 
                        onClick={() => { setSelectedClient(client); setIsClientTransactionModalOpen(true); }}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl text-[10px] font-bold lethal-mono tracking-widest transition-all flex items-center justify-center gap-2"
                      >
                        <CreditCard size={14} /> ADJUST BALANCE
                      </button>
                      <button 
                        onClick={() => {
                          setEditingClient(client);
                          setClientForm({ name: client.name, phone: client.phone, email: client.email, totalDebt: client.totalDebt });
                          setIsClientModalOpen(true);
                        }}
                        className="w-12 bg-zinc-800 hover:bg-lethal-orange/20 hover:text-lethal-orange text-zinc-500 rounded-xl flex items-center justify-center transition-all"
                        title="Edit Client"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClient(client.id)}
                        className="w-12 bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-500 text-zinc-500 rounded-xl flex items-center justify-center transition-all"
                        title="Delete Client"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="pt-4 border-t border-zinc-800/50">
                      <p className="lethal-mono text-[8px] text-zinc-600 uppercase mb-3 tracking-widest">Recent Ledger Entries</p>
                      <div className="space-y-2">
                        {clientTransactions
                          .filter(t => t.clientId === client.id)
                          .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
                          .slice(0, 3)
                          .map(t => (
                            <div key={t.id} className="flex justify-between items-center text-[10px] lethal-mono">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "w-1 h-1 rounded-full",
                                  t.type === 'CREDIT' ? "bg-rose-500" : "bg-emerald-500"
                                )} />
                                <span className="text-zinc-500">{format(parseISO(t.date), 'MMM dd')}</span>
                                <span className="text-zinc-300 truncate max-w-[120px]">
                                  {t.description} {t.quantity && t.quantity > 1 ? `(x${t.quantity})` : ''}
                                </span>
                              </div>
                              <span className={t.type === 'CREDIT' ? "text-rose-500" : "text-emerald-500"}>
                                {t.type === 'CREDIT' ? '+' : '-'}{f(t.amount)}
                              </span>
                            </div>
                          ))}
                        {clientTransactions.filter(t => t.clientId === client.id).length === 0 && (
                          <p className="text-[9px] lethal-mono text-zinc-700 italic">No ledger activity recorded</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
        {activeTab === 'reports' && (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold lethal-title">Intelligence Reports</h2>
              <button 
                onClick={exportToPDF}
                className="flex items-center gap-2 bg-lethal-orange text-black px-6 py-3 rounded-full font-bold lethal-mono text-[10px] tracking-widest hover:scale-105 transition-transform"
              >
                <Download size={16} /> EXPORT PDF
              </button>
            </div>

            <div className="bg-lethal-gray border border-zinc-800 p-6 rounded-3xl space-y-4">
              <label className="lethal-mono text-[10px] text-zinc-500 uppercase tracking-widest">Select Report Date</label>
              <input 
                type="date" 
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none lethal-mono"
              />
            </div>

            {(() => {
              const daySales = sales.filter(s => s.date === reportDate);
              const dayExpenses = expenses.filter(e => e.date === reportDate);
              const dayRestocks = restocks.filter(r => r.date === reportDate);
              
              const revenue = round(daySales.reduce((acc, s) => acc + (s.quantity * s.sellingPrice - s.discount), 0));
              const totalExpenses = round(dayExpenses.reduce((acc, e) => acc + e.amount, 0));
              const restockCost = round(dayRestocks.reduce((acc, r) => acc + (r.quantity * r.unitCost), 0));
              
              const cogs = round(daySales.reduce((acc, sale) => {
                const buyingPrice = sale.buyingPrice ?? products.find(p => p.id === sale.productId)?.buyingPrice ?? 0;
                return acc + (sale.quantity * buyingPrice);
              }, 0));
              
              const netProfit = round(revenue - totalExpenses - cogs);

              return (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-lethal-gray p-5 sm:p-6 rounded-[32px] border border-zinc-800 relative min-h-[110px] flex flex-col justify-between">
                      <p className="lethal-mono text-[10px] text-zinc-500 uppercase tracking-widest">Daily Revenue</p>
                      <div className="mt-2">
                        <p className="text-3xl sm:text-4xl font-bold tracking-tight text-white">{f(revenue)}</p>
                      </div>
                    </div>
                    {userRole === 'executive' && (
                      <div className="bg-lethal-gray p-5 sm:p-6 rounded-[32px] border border-zinc-800 relative min-h-[110px] flex flex-col justify-between">
                        <p className="lethal-mono text-[10px] text-zinc-500 uppercase tracking-widest">Daily Profit</p>
                        <div className="mt-2">
                          <p className={cn("text-3xl sm:text-4xl font-bold tracking-tight", netProfit >= 0 ? "text-emerald-500" : "text-rose-500")}>
                            {f(netProfit)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="lethal-mono text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Sales Log ({daySales.length})</h3>
                    {daySales.length > 0 ? (
                      <div className="space-y-2">
                        {daySales.map(s => {
                          const product = products.find(p => p.id === s.productId);
                          return (
                            <div key={s.id} className="bg-lethal-gray/50 border border-zinc-800/50 p-4 rounded-2xl flex justify-between items-center">
                              <div>
                                <p className="text-sm font-bold text-white">{product?.name || 'Unknown'}</p>
                                <p className="lethal-mono text-[9px] text-zinc-500">QTY: {s.quantity} • {s.paymentMethod}</p>
                              </div>
                              <p className="text-sm font-bold text-lethal-orange">{f(s.quantity * s.sellingPrice - s.discount)}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center py-8 text-[10px] lethal-mono text-zinc-700 italic border border-dashed border-zinc-800 rounded-3xl">NO SALES RECORDED FOR THIS DATE</p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="lethal-mono text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Expense Log ({dayExpenses.length})</h3>
                    {dayExpenses.length > 0 ? (
                      <div className="space-y-2">
                        {dayExpenses.map(e => (
                          <div key={e.id} className="bg-lethal-gray/50 border border-zinc-800/50 p-4 rounded-2xl flex justify-between items-center">
                            <div>
                              <p className="text-sm font-bold text-white">{e.description}</p>
                              <p className="lethal-mono text-[9px] text-zinc-500">{e.category}</p>
                            </div>
                            <p className="text-sm font-bold text-rose-500">{f(e.amount)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-8 text-[10px] lethal-mono text-zinc-700 italic border border-dashed border-zinc-800 rounded-3xl">NO EXPENSES RECORDED FOR THIS DATE</p>
                    )}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
        {activeTab === 'alerts' && userRole === 'executive' && (
          <motion.div
            key="alerts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold lethal-title">Alert Command</h2>
              <button 
                onClick={() => setIsAlertModalOpen(true)}
                className="w-10 h-10 rounded-full lethal-pill-active flex items-center justify-center"
              >
                <Plus size={20} />
              </button>
            </div>

            {/* Triggered Alerts Section */}
            {triggeredAlerts.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="lethal-mono text-[10px] font-bold text-lethal-orange tracking-widest">ACTIVE INCIDENTS</h3>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setTriggeredAlerts(triggeredAlerts.map(a => ({ ...a, isRead: true })))}
                      className="text-[8px] lethal-mono text-zinc-500 hover:text-white transition-colors"
                    >
                      MARK ALL AS READ
                    </button>
                    <button 
                      onClick={() => setTriggeredAlerts([])}
                      className="text-[8px] lethal-mono text-rose-500 hover:text-rose-400 transition-colors"
                    >
                      CLEAR ALL
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {triggeredAlerts.slice(0, 5).map((alert) => (
                    <div 
                      key={alert.id} 
                      className={cn(
                        "p-4 rounded-2xl border flex gap-4 items-start transition-all",
                        alert.isRead ? "bg-lethal-gray/30 border-zinc-800/50 opacity-60" : "bg-rose-500/10 border-rose-500/30"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg mt-1", alert.isRead ? "bg-zinc-800 text-zinc-500" : "bg-rose-500 text-white")}>
                        <AlertTriangle size={14} />
                      </div>
                      <div className="flex-1">
                        <p className={cn("text-xs font-bold", alert.isRead ? "text-zinc-400" : "text-white")}>{alert.message}</p>
                        <p className="lethal-mono text-[8px] text-zinc-600 mt-1">{format(parseISO(alert.timestamp), 'HH:mm:ss • MMM dd')}</p>
                      </div>
                      {!alert.isRead && (
                        <button 
                          onClick={() => setTriggeredAlerts(triggeredAlerts.map(a => a.id === alert.id ? { ...a, isRead: true } : a))}
                          className="text-zinc-500 hover:text-white"
                        >
                          <CheckCircle size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alert Rules Section */}
            <div className="space-y-4">
              <h3 className="lethal-mono text-[10px] font-bold text-zinc-500 tracking-widest">WATCHLIST RULES</h3>
              {alerts.length === 0 ? (
                <div className="bg-lethal-gray/30 border border-dashed border-zinc-800 p-12 rounded-[2rem] text-center">
                  <Activity className="mx-auto text-zinc-800 mb-4" size={32} />
                  <p className="lethal-mono text-[10px] text-zinc-600">NO ACTIVE SURVEILLANCE RULES</p>
                  <button onClick={() => setIsAlertModalOpen(true)} className="mt-4 text-[10px] lethal-mono text-lethal-orange hover:underline">INITIALIZE RULE</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((rule) => (
                    <div key={rule.id} className="bg-lethal-gray border border-zinc-800 p-5 rounded-3xl flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-xl", rule.isActive ? "bg-lethal-orange/10 text-lethal-orange" : "bg-zinc-800 text-zinc-600")}>
                          <Shield size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{rule.name}</h4>
                          <p className="lethal-mono text-[9px] text-zinc-500">
                            {rule.type.replace('_', ' ')} • THRESHOLD: {rule.type === 'SALES_TARGET' ? f(rule.threshold) : rule.threshold}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => handleToggleAlert(rule)}
                          className={cn(
                            "w-10 h-5 rounded-full relative transition-all",
                            rule.isActive ? "bg-lethal-orange" : "bg-zinc-800"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                            rule.isActive ? "right-1" : "left-1"
                          )} />
                        </button>
                        <button onClick={() => handleDeleteAlert(rule.id)} className="text-zinc-700 hover:text-rose-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
        {activeTab === 'security' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-bold lethal-title">Security Settings</h2>
              <p className="lethal-mono text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Configure App Lock & Access</p>
            </div>

            <div className="bg-lethal-gray border border-zinc-800 p-8 rounded-[40px] space-y-8">
              <div className="flex items-center gap-4 text-lethal-orange">
                <Fingerprint size={32} />
                <div>
                  <h3 className="text-white font-bold">App Lock System</h3>
                  <p className="text-zinc-500 text-xs">Secure your dashboard with a local PIN or password.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setAppLockConfig({ ...appLockConfig, type: 'pin' })}
                    className={cn(
                      "py-4 rounded-2xl font-bold lethal-mono text-[10px] tracking-widest transition-all border",
                      appLockConfig.type === 'pin' ? "bg-lethal-orange text-black border-lethal-orange" : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600"
                    )}
                  >
                    PIN LOCK
                  </button>
                  <button 
                    onClick={() => setAppLockConfig({ ...appLockConfig, type: 'password' })}
                    className={cn(
                      "py-4 rounded-2xl font-bold lethal-mono text-[10px] tracking-widest transition-all border",
                      appLockConfig.type === 'password' ? "bg-lethal-orange text-black border-lethal-orange" : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600"
                    )}
                  >
                    PASSWORD LOCK
                  </button>
                </div>

                {appLockConfig.type && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2 uppercase">
                        SET NEW {appLockConfig.type === 'pin' ? '4-DIGIT PIN' : 'PASSWORD'}
                      </label>
                      <input 
                        type={appLockConfig.type === 'pin' ? 'number' : 'password'}
                        placeholder={appLockConfig.type === 'pin' ? '0000' : '••••••••'}
                        value={appLockConfig.value || ''}
                        onChange={e => setAppLockConfig({ ...appLockConfig, value: e.target.value })}
                        className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 italic px-2">
                      * This lock is stored locally on this device. You will still need to log in with your account if you clear your browser data.
                    </p>
                  </div>
                )}

                <button 
                  onClick={() => {
                    setAppLockConfig({ type: null, value: null });
                    setIsAppLocked(false);
                  }}
                  className="w-full py-4 rounded-2xl font-bold lethal-mono text-[10px] tracking-widest text-rose-500 border border-rose-500/20 hover:bg-rose-500/10 transition-all"
                >
                  DISABLE APP LOCK
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'staff' && userRole === 'executive' && (
          <motion.div
            key="staff"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold lethal-title">Staff Command</h2>
              <button 
                onClick={() => {
                  setEditingStaff(null);
                  setStaffForm({ email: '', role: 'employee', displayName: '', assignedStoreIds: [] });
                  setIsStaffModalOpen(true);
                }}
                className="w-10 h-10 rounded-full lethal-pill-active flex items-center justify-center"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="SEARCH STAFF..." 
                value={staffSearch}
                onChange={e => setStaffSearch(e.target.value)}
                className="w-full bg-lethal-gray border border-zinc-800 rounded-3xl pl-12 pr-6 py-4 text-sm focus:border-lethal-orange outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {staff
                .filter(s => s.email.toLowerCase().includes(staffSearch.toLowerCase()) || (s.displayName || '').toLowerCase().includes(staffSearch.toLowerCase()))
                .map(member => (
                  <div key={member.id} className="bg-lethal-gray border border-zinc-800 p-6 rounded-3xl flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                        <Users size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{member.displayName || 'Unnamed Staff'}</h4>
                        <p className="lethal-mono text-[9px] text-zinc-500 uppercase">{member.email}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <button 
                            onClick={async () => {
                              try {
                                const newRole: UserRole = member.role === 'executive' ? 'employee' : 'executive';
                                await updateDoc(doc(db, 'users', member.id), { role: newRole });
                              } catch (err) {
                                handleFirestoreError(err, OperationType.UPDATE, `users/${member.id}`);
                              }
                            }}
                            className={cn(
                              "px-2 py-0.5 rounded text-[8px] font-bold lethal-mono uppercase transition-all hover:scale-105",
                              member.role === 'executive' ? "bg-lethal-orange/10 text-lethal-orange" : "bg-zinc-800 text-zinc-500"
                            )}
                          >
                            {member.role === 'executive' ? 'EXEC' : 'STAFF'}
                          </button>
                          {member.assignedStoreIds?.map(storeId => {
                            const store = stores.find(s => s.id === storeId);
                            return store ? (
                              <span key={storeId} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[8px] font-bold lethal-mono uppercase">
                                {store.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setEditingStaff(member);
                          setStaffForm({ 
                            email: member.email, 
                            role: member.role, 
                            displayName: member.displayName || '',
                            assignedStoreIds: member.assignedStoreIds || []
                          });
                          setIsStaffModalOpen(true);
                        }}
                        className="p-2 text-zinc-500 hover:text-lethal-orange transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteStaff(member.id)}
                        className="p-2 text-zinc-500 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
        {activeTab === 'stores' && userRole === 'executive' && (
          <motion.div
            key="stores"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold lethal-title">Store Command</h2>
              <button 
                onClick={() => {
                  setEditingStore(null);
                  setStoreForm({ name: '', location: '' });
                  setIsStoreModalOpen(true);
                }}
                className="w-10 h-10 rounded-full lethal-pill-active flex items-center justify-center"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stores.map(store => (
                <div key={store.id} className="bg-lethal-gray border border-zinc-800 p-6 rounded-3xl flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                      <Package size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{store.name}</h4>
                      <p className="lethal-mono text-[9px] text-zinc-500 uppercase">{store.location || 'NO LOCATION SET'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        if (isSubmitting) return;
                        setEditingStore(store);
                        setStoreForm({ name: store.name, location: store.location || '' });
                        setIsStoreModalOpen(true);
                      }}
                      disabled={isSubmitting}
                      className={cn(
                        "p-2 transition-colors",
                        isSubmitting ? "text-zinc-800 cursor-not-allowed" : "text-zinc-500 hover:text-lethal-orange"
                      )}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => !isSubmitting && handleDeleteStore(store.id)}
                      disabled={isSubmitting}
                      className={cn(
                        "p-2 transition-colors",
                        isSubmitting ? "text-zinc-800 cursor-not-allowed" : "text-zinc-500 hover:text-rose-500"
                      )}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <button className="fixed bottom-8 right-8 w-16 h-16 rounded-full lethal-pill-active flex items-center justify-center shadow-2xl z-40 hover:scale-110 transition-transform">
        <MessageCircle size={28} />
      </button>

      {/* Modals (Simplified for token limit, but functional) */}
      <AnimatePresence>
        {(isProductModalOpen || isSaleModalOpen || isExpenseModalOpen || isRestockModalOpen || isAlertModalOpen || isClientModalOpen || isClientTransactionModalOpen || isStaffModalOpen || isStoreModalOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsProductModalOpen(false); setIsSaleModalOpen(false); setIsExpenseModalOpen(false); setIsRestockModalOpen(false); setIsAlertModalOpen(false); setIsClientModalOpen(false); setIsClientTransactionModalOpen(false); setIsStaffModalOpen(false); setIsStoreModalOpen(false); setModalSearch(''); }} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div 
              initial={{ y: 30, opacity: 0, scale: 0.98 }} 
              animate={{ y: 0, opacity: 1, scale: 1 }} 
              exit={{ y: 30, opacity: 0, scale: 0.98 }} 
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative bg-lethal-gray border border-zinc-800 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold lethal-title">
                  {isProductModalOpen ? (editingProduct ? 'EDIT STOCK' : 'NEW STOCK') : isSaleModalOpen ? 'ADD SALE' : isExpenseModalOpen ? 'ADD EXPENSE' : isRestockModalOpen ? 'RESTOCK STOCK' : isAlertModalOpen ? 'NEW ALERT' : isClientModalOpen ? 'NEW CLIENT' : isStaffModalOpen ? (editingStaff ? 'EDIT STAFF' : 'NEW STAFF') : isStoreModalOpen ? (editingStore ? 'EDIT STORE' : 'NEW STORE') : 'ADJUST DEBT'}
                </h3>
                <button onClick={() => { setIsProductModalOpen(false); setIsSaleModalOpen(false); setIsExpenseModalOpen(false); setIsRestockModalOpen(false); setIsAlertModalOpen(false); setIsClientModalOpen(false); setIsClientTransactionModalOpen(false); setIsStaffModalOpen(false); setIsStoreModalOpen(false); setModalSearch(''); }} className="text-zinc-500 hover:text-white"><X size={24} /></button>
              </div>
              
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {isStoreModalOpen && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">STORE NAME</label>
                      <input type="text" placeholder="NAME" value={storeForm.name} onChange={e => setStoreForm({ ...storeForm, name: e.target.value })} className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">LOCATION</label>
                      <input type="text" placeholder="LOCATION" value={storeForm.location} onChange={e => setStoreForm({ ...storeForm, location: e.target.value })} className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" />
                    </div>
                    <button 
                      onClick={handleAddStore} 
                      disabled={isSubmitting}
                      className={cn(
                        "w-full py-5 rounded-2xl font-bold lethal-mono text-sm tracking-widest uppercase transition-all",
                        isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "lethal-pill-active"
                      )}
                    >
                      {isSubmitting ? 'PROCESSING...' : (editingStore ? 'Update Store' : 'Initialize Store')}
                    </button>
                  </>
                )}
                {isStaffModalOpen && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">DISPLAY NAME</label>
                      <input type="text" placeholder="NAME" value={staffForm.displayName} onChange={e => setStaffForm({ ...staffForm, displayName: e.target.value })} className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">EMAIL ADDRESS</label>
                      <input type="email" placeholder="EMAIL" value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" disabled={!!editingStaff} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">USER ROLE</label>
                      <div className="flex bg-lethal-black p-1 rounded-2xl border border-zinc-800">
                        <button 
                          onClick={() => setStaffForm({ ...staffForm, role: 'employee' })}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-[10px] font-bold lethal-mono transition-all",
                            staffForm.role === 'employee' ? "bg-zinc-700 text-white" : "text-zinc-500"
                          )}
                        >
                          STAFF
                        </button>
                        <button 
                          onClick={() => setStaffForm({ ...staffForm, role: 'executive' })}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-[10px] font-bold lethal-mono transition-all",
                            staffForm.role === 'executive' ? "bg-lethal-orange text-black" : "text-zinc-500"
                          )}
                        >
                          EXECUTIVE
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">ASSIGNED STORES</label>
                      <div className="grid grid-cols-2 gap-2">
                        {stores.map(store => (
                          <button
                            key={store.id}
                            onClick={() => {
                              const current = staffForm.assignedStoreIds || [];
                              const next = current.includes(store.id) 
                                ? current.filter(id => id !== store.id)
                                : [...current, store.id];
                              setStaffForm({ ...staffForm, assignedStoreIds: next });
                            }}
                            className={cn(
                              "px-4 py-3 rounded-xl text-[8px] font-bold lethal-mono transition-all border",
                              staffForm.assignedStoreIds?.includes(store.id) 
                                ? "bg-lethal-orange/10 border-lethal-orange text-lethal-orange" 
                                : "bg-lethal-black border-zinc-800 text-zinc-500"
                            )}
                          >
                            {store.name.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={handleAddStaff} 
                      disabled={isSubmitting}
                      className={cn(
                        "w-full py-5 rounded-2xl font-bold lethal-mono text-sm tracking-widest uppercase transition-all",
                        isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "lethal-pill-active"
                      )}
                    >
                      {isSubmitting ? 'PROCESSING...' : (editingStaff ? 'Update Profile' : 'Authorize Staff')}
                    </button>
                  </>
                )}
                {isAlertModalOpen && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">ALERT NAME</label>
                      <input type="text" placeholder="ALERT NAME" value={alertForm.name} onChange={e => setAlertForm({ ...alertForm, name: e.target.value })} className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">ALERT TYPE</label>
                      <select 
                        value={alertForm.type} 
                        onChange={e => setAlertForm({ ...alertForm, type: e.target.value as AlertType })} 
                        className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none appearance-none"
                      >
                        <option value="LOW_STOCK">LOW STOCK WARNING</option>
                        <option value="SALES_TARGET">SALES TARGET REACHED</option>
                        <option value="PROFIT_MARGIN">PROFIT MARGIN DROP</option>
                        <option value="SALES_VELOCITY">SALES VELOCITY SPIKE</option>
                      </select>
                    </div>
                    {(alertForm.type === 'LOW_STOCK' || alertForm.type === 'SALES_VELOCITY') && (
                      <div className="space-y-2">
                        <label className="text-[10px] lethal-mono text-zinc-500 ml-2">TARGET PRODUCT</label>
                        <select 
                          value={alertForm.targetId} 
                          onChange={e => setAlertForm({ ...alertForm, targetId: e.target.value })} 
                          className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none appearance-none"
                        >
                          <option value="">SELECT PRODUCT...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">THRESHOLD VALUE</label>
                      <input 
                        type="number" 
                        placeholder="THRESHOLD" 
                        value={alertForm.threshold ?? ''} 
                        onChange={e => {
                          const val = e.target.value;
                          setAlertForm({ ...alertForm, threshold: val === '' ? undefined : Number(val) });
                        }} 
                        className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" 
                      />
                    </div>
                    <button 
                      onClick={handleAddAlert} 
                      disabled={isSubmitting}
                      className={cn(
                        "w-full py-5 rounded-2xl font-bold lethal-mono text-sm tracking-widest transition-all",
                        isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "lethal-pill-active"
                      )}
                    >
                      {isSubmitting ? 'PROCESSING...' : 'INITIALIZE SURVEILLANCE'}
                    </button>
                  </>
                )}

                {isClientModalOpen && (
                  <>
                    <h2 className="text-xl font-bold lethal-title mb-6 uppercase tracking-widest">
                      {editingClient ? 'Edit Client Profile' : 'Register New Client'}
                    </h2>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">CLIENT NAME</label>
                      <input type="text" placeholder="FULL NAME" value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">PHONE NUMBER</label>
                      <input type="text" placeholder="PHONE" value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">EMAIL (OPTIONAL)</label>
                      <input type="email" placeholder="EMAIL" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" />
                    </div>
                    <button 
                      onClick={handleAddClient} 
                      disabled={isSubmitting}
                      className={cn(
                        "w-full py-5 rounded-2xl font-bold lethal-mono text-sm tracking-widest uppercase transition-all",
                        isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "lethal-pill-active"
                      )}
                    >
                      {isSubmitting ? 'PROCESSING...' : (editingClient ? 'Update Client' : 'Register Client')}
                    </button>
                  </>
                )}

                {isClientTransactionModalOpen && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">TRANSACTION TYPE</label>
                      <div className="flex bg-lethal-black p-1 rounded-2xl border border-zinc-800">
                        <button 
                          onClick={() => setClientTransactionForm({ ...clientTransactionForm, type: 'CREDIT' })}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-[10px] font-bold lethal-mono transition-all",
                            clientTransactionForm.type === 'CREDIT' ? "bg-rose-500 text-white" : "text-zinc-500"
                          )}
                        >
                          INCREASE DEBT
                        </button>
                        <button 
                          onClick={() => setClientTransactionForm({ ...clientTransactionForm, type: 'PAYMENT' })}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-[10px] font-bold lethal-mono transition-all",
                            clientTransactionForm.type === 'PAYMENT' ? "bg-emerald-500 text-white" : "text-zinc-500"
                          )}
                        >
                          REDUCE DEBT
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">AMOUNT</label>
                      <input 
                        type="number" 
                        placeholder="AMOUNT" 
                        value={clientTransactionForm.amount ?? ''} 
                        onChange={e => {
                          const val = e.target.value;
                          setClientTransactionForm({ ...clientTransactionForm, amount: val === '' ? undefined : Number(val) });
                        }} 
                        className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">DESCRIPTION</label>
                      <input type="text" placeholder="e.g. 5kg Sugar, Partial Payment" value={clientTransactionForm.description} onChange={e => setClientTransactionForm({ ...clientTransactionForm, description: e.target.value })} className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" />
                    </div>
                    {clientTransactionForm.type === 'CREDIT' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] lethal-mono text-zinc-500 ml-2">LINKED PRODUCT</label>
                          <select 
                            value={clientTransactionForm.productId || ''} 
                            onChange={e => {
                              const p = products.find(prod => prod.id === e.target.value);
                              const qty = clientTransactionForm.quantity;
                              setClientTransactionForm({ 
                                ...clientTransactionForm, 
                                productId: e.target.value,
                                quantity: qty,
                                amount: p ? p.sellingPrice * (qty || 0) : clientTransactionForm.amount,
                                description: p ? `${p.name} on Credit` : clientTransactionForm.description
                              });
                            }} 
                            className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none appearance-none"
                          >
                            <option value="">NO PRODUCT LINKED</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] lethal-mono text-zinc-500 ml-2">QUANTITY</label>
                          <input 
                            type="number" 
                            placeholder="QTY" 
                            value={clientTransactionForm.quantity ?? ''} 
                            onChange={e => {
                              const val = e.target.value;
                              const qty = val === '' ? undefined : Number(val);
                              const p = products.find(prod => prod.id === clientTransactionForm.productId);
                              setClientTransactionForm({ 
                                ...clientTransactionForm, 
                                quantity: qty,
                                amount: p ? p.sellingPrice * (qty || 0) : clientTransactionForm.amount
                              });
                            }} 
                            className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" 
                          />
                        </div>
                      </div>
                    )}
                    <button 
                      onClick={handleAddClientTransaction} 
                      disabled={isSubmitting}
                      className={cn(
                        "w-full py-5 rounded-2xl font-bold lethal-mono text-sm tracking-widest uppercase transition-all",
                        isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "lethal-pill-active"
                      )}
                    >
                      {isSubmitting ? 'PROCESSING...' : (clientTransactionForm.type === 'CREDIT' ? 'Record Credit' : 'Record Payment')}
                    </button>
                  </>
                )}

                {isProductModalOpen && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">STOCK NAME</label>
                      <input type="text" placeholder="STOCK NAME" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">STOCK</label>
                      <input 
                        type="number" 
                        placeholder="STOCK" 
                        value={productForm.stockQuantity ?? ''} 
                        onChange={e => {
                          const val = e.target.value;
                          setProductForm({ ...productForm, stockQuantity: val === '' ? undefined : Number(val) });
                        }} 
                        className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] lethal-mono text-zinc-500 ml-2">BUYING PRICE</label>
                        <input 
                          type="number" 
                          placeholder="BUYING" 
                          value={productForm.buyingPrice ?? ''} 
                          onChange={e => {
                            const val = e.target.value;
                            setProductForm({ ...productForm, buyingPrice: val === '' ? undefined : Number(val) });
                          }} 
                          className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] lethal-mono text-zinc-500 ml-2">SELLING PRICE</label>
                        <input 
                          type="number" 
                          placeholder="SELLING" 
                          value={productForm.sellingPrice ?? ''} 
                          onChange={e => {
                            const val = e.target.value;
                            setProductForm({ ...productForm, sellingPrice: val === '' ? undefined : Number(val) });
                          }} 
                          className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" 
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleAddProduct} 
                      disabled={isSubmitting}
                      className={cn(
                        "w-full py-5 rounded-2xl font-bold lethal-mono text-sm tracking-widest transition-all",
                        isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "lethal-pill-active"
                      )}
                    >
                      {isSubmitting ? 'PROCESSING...' : 'EXECUTE STOCK COMMAND'}
                    </button>
                  </>
                )}

                {isSaleModalOpen && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">TARGET STOCK</label>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                        <input 
                          type="text" 
                          placeholder="SEARCH STOCK..." 
                          value={modalSearch}
                          onChange={e => setModalSearch(e.target.value)}
                          className="w-full bg-lethal-black border border-zinc-800 rounded-2xl pl-10 pr-4 py-3 text-xs lethal-mono focus:border-lethal-orange outline-none mb-2"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-2 pr-2 no-scrollbar">
                        {products
                          .filter(p => p.name.toLowerCase().includes(modalSearch.toLowerCase()))
                          .map(p => (
                            <button
                              key={p.id}
                              onClick={() => setSaleForm({ ...saleForm, productId: p.id })}
                              className={cn(
                                "w-full text-left px-4 py-3 rounded-xl text-xs lethal-mono transition-all border",
                                saleForm.productId === p.id 
                                  ? "bg-lethal-orange/20 border-lethal-orange text-lethal-orange" 
                                  : "bg-lethal-black border-zinc-800 text-zinc-400 hover:border-zinc-600"
                              )}
                            >
                              <div className="flex justify-between items-center">
                                <span>{p.name}</span>
                                <span className="text-[8px] opacity-60">{p.stockQuantity} LEFT</span>
                              </div>
                            </button>
                          ))
                        }
                        {products.filter(p => p.name.toLowerCase().includes(modalSearch.toLowerCase())).length === 0 && (
                          <p className="text-center py-4 text-[10px] lethal-mono text-zinc-600">NO MATCHING STOCK FOUND</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] lethal-mono text-zinc-500 ml-2">QUANTITY</label>
                        <input 
                          type="number" 
                          placeholder="QUANTITY" 
                          value={saleForm.quantity ?? ''} 
                          onChange={e => {
                            const val = e.target.value;
                            setSaleForm({ ...saleForm, quantity: val === '' ? undefined : Number(val) });
                          }} 
                          className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] lethal-mono text-zinc-500 ml-2">DISCOUNT</label>
                        <input 
                          type="number" 
                          placeholder="DISCOUNT" 
                          value={saleForm.discount ?? ''} 
                          onChange={e => {
                            const val = e.target.value;
                            setSaleForm({ ...saleForm, discount: val === '' ? undefined : Number(val) });
                          }} 
                          className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">PAYMENT METHOD</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['Cash', 'Credit', 'Mobile Money Transfer', 'Cheque', 'Bank'] as PaymentMethod[]).map(method => (
                          <button
                            key={method}
                            onClick={() => setSaleForm({ ...saleForm, paymentMethod: method })}
                            className={cn(
                              "py-2 px-1 rounded-xl text-[8px] lethal-mono border transition-all",
                              saleForm.paymentMethod === method
                                ? "bg-lethal-orange/20 border-lethal-orange text-lethal-orange"
                                : "bg-lethal-black border-zinc-800 text-zinc-500 hover:border-zinc-700"
                            )}
                          >
                            {method.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={handleAddSale} 
                      disabled={isSubmitting}
                      className={cn(
                        "w-full py-5 rounded-2xl font-bold lethal-mono text-sm tracking-widest transition-all",
                        isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "lethal-pill-active"
                      )}
                    >
                      {isSubmitting ? 'PROCESSING...' : 'ADD TRANSACTION'}
                    </button>
                  </>
                )}
                
                {isRestockModalOpen && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">TARGET STOCK</label>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                        <input 
                          type="text" 
                          placeholder="SEARCH STOCK..." 
                          value={modalSearch}
                          onChange={e => setModalSearch(e.target.value)}
                          className="w-full bg-lethal-black border border-zinc-800 rounded-2xl pl-10 pr-4 py-3 text-xs lethal-mono focus:border-lethal-orange outline-none mb-2"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-2 pr-2 no-scrollbar">
                        {products
                          .filter(p => p.name.toLowerCase().includes(modalSearch.toLowerCase()))
                          .map(p => (
                            <button
                              key={p.id}
                              onClick={() => setRestockForm({ ...restockForm, productId: p.id, unitCost: p.buyingPrice })}
                              className={cn(
                                "w-full text-left px-4 py-3 rounded-xl text-xs lethal-mono transition-all border",
                                restockForm.productId === p.id 
                                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-500" 
                                  : "bg-lethal-black border-zinc-800 text-zinc-400 hover:border-zinc-600"
                              )}
                            >
                              <div className="flex justify-between items-center">
                                <span>{p.name}</span>
                                <span className="text-[8px] opacity-60">{p.stockQuantity} {p.unit} CURRENT</span>
                              </div>
                            </button>
                          ))
                        }
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] lethal-mono text-zinc-500 ml-2">RESTOCK QTY</label>
                        <input 
                          type="number" 
                          placeholder="QUANTITY" 
                          value={restockForm.quantity ?? ''} 
                          onChange={e => {
                            const val = e.target.value;
                            setRestockForm({ ...restockForm, quantity: val === '' ? undefined : Number(val) });
                          }} 
                          className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] lethal-mono text-zinc-500 ml-2">UNIT COST</label>
                        <input 
                          type="number" 
                          placeholder="COST" 
                          value={restockForm.unitCost ?? ''} 
                          onChange={e => {
                            const val = e.target.value;
                            setRestockForm({ ...restockForm, unitCost: val === '' ? undefined : Number(val) });
                          }} 
                          className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" 
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleAddRestock} 
                      disabled={isSubmitting}
                      className={cn(
                        "w-full py-5 rounded-2xl font-bold lethal-mono text-sm tracking-widest transition-all",
                        isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-emerald-500 text-black hover:bg-emerald-400"
                      )}
                    >
                      {isSubmitting ? 'PROCESSING...' : 'EXECUTE RESTOCK'}
                    </button>
                  </>
                )}

                {isExpenseModalOpen && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">CATEGORY</label>
                      <select 
                        value={expenseForm.category} 
                        onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })} 
                        className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none appearance-none"
                      >
                        {['Rent', 'Utilities', 'Supplies', 'Wages', 'Other']
                          .map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)
                        }
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">DESCRIPTION</label>
                      <input type="text" placeholder="DESCRIPTION" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">AMOUNT</label>
                      <input 
                        type="number" 
                        placeholder="AMOUNT" 
                        value={expenseForm.amount ?? ''} 
                        onChange={e => {
                          const val = e.target.value;
                          setExpenseForm({ ...expenseForm, amount: val === '' ? undefined : Number(val) });
                        }} 
                        className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" 
                      />
                    </div>
                    <button 
                      onClick={handleAddExpense} 
                      disabled={isSubmitting}
                      className={cn(
                        "w-full py-5 rounded-2xl font-bold lethal-mono text-sm tracking-widest transition-all",
                        isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "lethal-pill-active"
                      )}
                    >
                      {isSubmitting ? 'PROCESSING...' : 'ADD EXPENDITURE'}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Auth Modal for Role Transition */}
      <AnimatePresence>
        {authModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAuthModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              className="bg-lethal-gray w-full max-w-md rounded-[40px] border border-zinc-800 p-8 relative z-10 space-y-8"
            >
              <div className="space-y-2">
                <p className="lethal-mono text-[10px] text-lethal-orange uppercase tracking-widest">AUTHENTICATION REQUIRED</p>
                <h2 className="text-2xl font-bold text-white leading-tight">Enter Executive Password</h2>
                <p className="text-zinc-500 text-xs">This area contains sensitive financial data and administrative controls.</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="lethal-mono text-[10px] text-zinc-500 uppercase tracking-widest">PASSWORD</label>
                  <input 
                    type="password"
                    value={authModal.password}
                    onChange={(e) => setAuthModal(prev => ({ ...prev, password: e.target.value as any, error: '' }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-lethal-orange transition-all"
                    placeholder="••••••••"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAuthSubmit();
                    }}
                  />
                  {authModal.error && <p className="text-rose-500 text-[10px] lethal-mono uppercase">{authModal.error}</p>}
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setAuthModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 bg-zinc-800 text-white py-4 rounded-2xl font-bold lethal-mono text-xs tracking-widest hover:bg-zinc-700 transition-all"
                >
                  CANCEL
                </button>
                <button 
                  onClick={handleAuthSubmit}
                  disabled={isSubmitting}
                  className={cn(
                    "flex-1 py-4 rounded-2xl font-bold lethal-mono text-xs tracking-widest transition-all",
                    isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-lethal-orange text-black hover:bg-orange-600"
                  )}
                >
                  {isSubmitting ? 'PROCESSING...' : 'VERIFY'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              className="bg-lethal-gray w-full max-w-md rounded-[40px] border border-zinc-800 p-8 relative z-10 space-y-8"
            >
              <div className="space-y-2">
                <p className="lethal-mono text-[10px] text-lethal-orange uppercase tracking-widest">{confirmModal.title}</p>
                <h2 className="text-2xl font-bold text-white leading-tight">{confirmModal.message}</h2>
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 bg-zinc-800 text-white py-4 rounded-2xl font-bold lethal-mono text-xs tracking-widest hover:bg-zinc-700 transition-all"
                >
                  CANCEL
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  disabled={isSubmitting}
                  className={cn(
                    "flex-1 py-4 rounded-2xl font-bold lethal-mono text-xs tracking-widest transition-all",
                    isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-rose-500 text-white hover:bg-rose-600"
                  )}
                >
                  {isSubmitting ? 'PROCESSING...' : 'CONFIRM'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
