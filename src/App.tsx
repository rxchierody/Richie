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
  LogIn,
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
  Fingerprint,
  Printer,
  Eye,
  EyeOff
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
import { Product, Sale, Expense, ExpenseCategory, PaymentMethod, AlertRule, TriggeredAlert, AlertType, Restock, UserRole, Client, ClientTransaction, Store, UserProfile, Quotation, Invoice, DocumentItem } from './types';
import { cn, formatCurrency, calculateMarkup, calculateMargin, round, EAST_AFRICAN_CURRENCIES } from './lib/utils';
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateProfile
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
  increment,
  Timestamp
} from 'firebase/firestore';

type Tab = 'portfolio' | 'store' | 'clients' | 'calendar' | 'documents' | 'reports' | 'alerts' | 'staff' | 'stores' | 'security' | 'help';
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
        <div className="min-h-screen bg-rowina-black flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-rowina-gray p-8 rounded-[40px] border border-rose-500/30 space-y-6 text-center">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto text-rose-500">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">System Failure</h2>
              <p className="text-zinc-500 text-sm leading-relaxed">{errorMessage}</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-rowina-blue text-black py-4 rounded-2xl font-bold rowina-mono text-sm tracking-widest hover:scale-[1.02] transition-all"
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
      providerInfo: auth.currentUser?.providerData ? auth.currentUser.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) : []
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
    <div className="bg-rowina-gray p-5 sm:p-6 rounded-[32px] border border-zinc-800 relative min-h-[110px] flex flex-col justify-between">
      <p className="rowina-mono text-[10px] text-zinc-500 uppercase tracking-widest">{label}</p>
      <div className="mt-2">
        <p className={cn(
          "text-3xl sm:text-4xl font-bold tracking-tight",
          highlight === "emerald" ? "text-emerald-500" : highlight === "rose" ? "text-rose-500" : "text-white"
        )}>{value}</p>
      </div>
      <div className={cn(
        "absolute bottom-5 right-6 flex items-center gap-1 rowina-mono text-[10px] font-bold",
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
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [emailForm, setEmailForm] = useState({ email: '', password: '', username: '' });
  const [showAuthScreen, setShowAuthScreen] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  
  // 2FA Auth State
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [pendingUser, setPendingUser] = useState<any>(null);

  // OTP Setup State
  const [otpSetupStep, setOtpSetupStep] = useState<'INITIAL' | 'QR' | 'VERIFY'>('INITIAL');
  const [otpQrCode, setOtpQrCode] = useState('');
  const [otpSecretRaw, setOtpSecretRaw] = useState('');
  const [otpVerifyError, setOtpVerifyError] = useState('');
  
  const [activeTab, setActiveTab] = useState<Tab>('portfolio');
  const [documentSubTab, setDocumentSubTab] = useState<'RECEIPTS' | 'INVOICES' | 'QUOTATIONS'>('RECEIPTS');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('daily');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | 'ALL'>('ALL');
  const [userRole, setUserRole] = useState<UserRole>('employee');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [executivePassword, setExecutivePassword] = useState<string>('admin123');
  const [currencyCode, setCurrencyCode] = useState(() => localStorage.getItem('rowina_currency') || 'USD');
  const f = (amount: number) => formatCurrency(amount, currencyCode);

  const [appLockConfig, setAppLockConfig] = useState<{
    type: 'pin' | 'password' | null;
    value: string | null;
  }>(() => {
    const saved = localStorage.getItem('rowina_lock_config');
    return saved ? JSON.parse(saved) : { type: null, value: null };
  });
  const [isAppLocked, setIsAppLocked] = useState(() => {
    const saved = localStorage.getItem('rowina_lock_config');
    const config = saved ? JSON.parse(saved) : { type: null, value: null };
    return !!config.type;
  });
  const [lockInput, setLockInput] = useState('');
  const [lockError, setLockError] = useState<string | null>(null);
  const [newExecPassword, setNewExecPassword] = useState('');
  const [isUpdatingExecPassword, setIsUpdatingExecPassword] = useState(false);

  useEffect(() => {
    localStorage.setItem('rowina_lock_config', JSON.stringify(appLockConfig));
  }, [appLockConfig]);

  useEffect(() => {
    localStorage.setItem('rowina_currency', currencyCode);
  }, [currencyCode]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && appLockConfig.type) {
        setIsAppLocked(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [appLockConfig.type]);

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | 'ALL'>('ALL');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [restocks, setRestocks] = useState<Restock[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientTransactions, setClientTransactions] = useState<ClientTransaction[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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
    password: string;
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
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isClientTransactionModalOpen, setIsClientTransactionModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  
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
  const [clientForm, setClientForm] = useState<Partial<Client>>({ name: '', phone: '', totalDebt: undefined });
  const [clientTransactionForm, setClientTransactionForm] = useState<Partial<ClientTransaction>>({ 
    date: format(new Date(), 'yyyy-MM-dd'), 
    type: 'CREDIT', 
    amount: undefined, 
    description: '', 
    clientId: '',
  });
  const [quotationForm, setQuotationForm] = useState<Partial<Quotation>>({
    clientName: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    items: [],
    status: 'Draft',
    totalAmount: 0
  });
  const [invoiceForm, setInvoiceForm] = useState<Partial<Invoice>>({
    clientName: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    items: [],
    status: 'Pending',
    totalAmount: 0,
    paidAmount: 0
  });
  const [alertForm, setAlertForm] = useState<Partial<AlertRule>>({ name: '', type: 'LOW_STOCK', threshold: undefined, isActive: true });
  const [staffForm, setStaffForm] = useState<{ email: string; role: UserRole; displayName: string; assignedStoreIds: string[]; tempPassword?: string }>({ email: '', role: 'employee', displayName: '', assignedStoreIds: [], tempPassword: '' });
  const [storeForm, setStoreForm] = useState<Partial<Store>>({ name: '', location: '' });
  
  const [reportDate, setReportDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [modalSearch, setModalSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productsSearch, setProductsSearch] = useState('');
  const [receiptsSearch, setReceiptsSearch] = useState('');

  useEffect(() => {
    if (globalError) {
      const timer = setTimeout(() => setGlobalError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [globalError]);
  const [clientsSearch, setClientsSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [alertsSearch, setAlertsSearch] = useState('');

  const [staff, setStaff] = useState<{ id: string; email: string; role: UserRole; displayName?: string }[]>([]);

  // PWA Install Logic
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsIOS(ios);
    setIsStandalone(standalone);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        setConfirmModal({
          isOpen: true,
          title: 'INSTALL ON IOS',
          message: 'To install Rowina Sales on your iPhone/iPad: tap the share button (square with arrow) in Safari and then select "Add to Home Screen".',
          onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
      }
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallButton(false);
    }
    setDeferredPrompt(null);
  };

  const requireAuth = (action: () => void) => {
    if (!user) {
      setAuthMode('signup');
      setShowAuthScreen(true);
      return;
    }
    action();
  };

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
      try {
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
              // Direct employees to a useful non-restricted tab if they are on an executive-only tab
              if (data.role === 'employee' && activeTab === 'portfolio') {
                setActiveTab('sales');
              }
            } else {
              // Check if there's a pre-authorized role by email
              // We use a try-catch here because the email-based doc might not exist 
              // and rules might deny access if it doesn't exist
              let emailDocData: UserProfile | null = null;
              try {
                const emailDoc = await getDoc(emailDocRef);
                if (emailDoc.exists()) {
                  emailDocData = emailDoc.data() as UserProfile;
                }
              } catch (e) {
                console.warn("Email-based profile check failed (expected for new users):", e);
              }

              let role: UserRole = 'executive'; // Default to executive for everyone to "own their own account"
              let displayName = currentUser.displayName || '';
              let assignedStoreIds: string[] = [];
              let ownerId: string | undefined = undefined;
              let tempPassword: string | undefined = undefined;

              if (emailDocData) {
                role = emailDocData.role;
                displayName = emailDocData.displayName || displayName;
                assignedStoreIds = emailDocData.assignedStoreIds || [];
                ownerId = emailDocData.ownerId;
                tempPassword = emailDocData.tempPassword;
                // Delete the temporary email-based doc
                try {
                  await deleteDoc(emailDocRef);
                } catch (e) {
                  console.error("Failed to delete temp email doc:", e);
                }
              }

              // Create the permanent UID-based doc
              const newProfile: UserProfile = {
                id: currentUser.uid,
                email: currentUser.email || '',
                role: role,
                displayName: displayName,
                assignedStoreIds: assignedStoreIds,
                ownerId: ownerId || (role === 'executive' ? currentUser.uid : undefined),
                tempPassword: tempPassword,
                notificationsEnabled: true
              };
              await setDoc(userDocRef, newProfile);
              setUserProfile(newProfile);
              setUserRole(role);
            }
          } catch (error) {
            console.error("Profile sync error:", error);
            // Don't block the app if profile sync fails, but log it
            // We still want to allow them in as a basic user if possible
            setUserRole('employee');
          }
        } else {
          setUserRole('employee');
          setUserProfile(null);
        }
      } catch (globalAuthError) {
        console.error("Global auth error:", globalAuthError);
      } finally {
        setIsAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Clear data on logout
  useEffect(() => {
    if (!user) {
      setStores([]);
      setProducts([]);
      setSales([]);
      setExpenses([]);
      setRestocks([]);
      setClients([]);
      setClientTransactions([]);
      setQuotations([]);
      setInvoices([]);
      setAlerts([]);
      setTriggeredAlerts([]);
      setStaff([]);
      setUserProfile(null);
    }
  }, [user]);

  // Firestore Real-time Sync
  useEffect(() => {
    if (!isAuthReady || !user?.uid) return;

    const accountId = userProfile?.ownerId || user?.uid;

    const unsubStores = onSnapshot(query(collection(db, 'stores'), where('userId', '==', accountId)), (snapshot) => {
      let storesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Store));
      
      // Filter stores for non-executives
      if (userRole !== 'executive' && userProfile?.assignedStoreIds) {
        storesData = storesData.filter(s => userProfile.assignedStoreIds?.includes(s.id));
      }
      
      setStores(storesData);
      
      // If the selected store was deleted, or if no store is selected and we have stores
      if (selectedStoreId !== 'ALL') {
        if (!storesData.find(s => s.id === selectedStoreId)) {
          setSelectedStoreId(storesData.length > 0 ? storesData[0].id : 'ALL');
        }
      } else if (userRole !== 'executive' && storesData.length > 0) {
        setSelectedStoreId(storesData[0].id);
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'stores'));

    const getQuery = (colName: string) => {
      let baseQuery = query(collection(db, colName), where('userId', '==', accountId));
      if (selectedStoreId !== 'ALL') {
        return query(baseQuery, where('storeId', '==', selectedStoreId));
      }
      // If non-executive and ALL is selected, we must filter by assigned stores to satisfy rules and requirements
      if (userRole !== 'executive' && userProfile?.assignedStoreIds) {
        if (userProfile.assignedStoreIds.length > 0) {
          // Firebase 'in' operator supports up to 30 values
          const limitedStoreIds = userProfile.assignedStoreIds.slice(0, 30);
          return query(baseQuery, where('storeId', 'in', limitedStoreIds));
        } else {
          // No stores assigned, return a query that will yield no results for storeId
          return query(baseQuery, where('storeId', '==', 'NONE_ASSIGNED'));
        }
      }
      return baseQuery;
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

    const unsubQuotations = onSnapshot(getQuery('quotations'), (snapshot) => {
      setQuotations(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Quotation)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'quotations'));

    const unsubInvoices = onSnapshot(getQuery('invoices'), (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Invoice)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'invoices'));

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

    const unsubStaff = onSnapshot(query(collection(db, 'users'), where('ownerId', '==', accountId)), (snapshot) => {
      setStaff(snapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as any))
        .filter(s => s.id !== user.uid)
      );
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        setExecutivePassword(snapshot.data().executivePassword);
      } else if (userRole === 'executive') {
        // Initialize if not exists
        setDoc(doc(db, 'settings', 'global'), { executivePassword: 'admin123' })
          .catch(err => console.error("Failed to init settings:", err));
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/global'));

    return () => {
      unsubStores();
      unsubProducts();
      unsubSales();
      unsubExpenses();
      unsubRestocks();
      unsubQuotations();
      unsubInvoices();
      unsubClients();
      unsubTransactions();
      unsubAlerts();
      unsubTriggered();
      unsubStaff();
      unsubSettings();
    };
  }, [isAuthReady, user, selectedStoreId, userRole, userProfile]);

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
    if (userProfile?.notificationsEnabled === false) return;

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
              userId: userProfile?.ownerId || user?.uid || '',
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
              userId: userProfile?.ownerId || user?.uid || '',
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
              userId: userProfile?.ownerId || user?.uid || '',
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
                userId: userProfile?.ownerId || user?.uid || '',
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
    setGlobalError(null);
    try {
      if (!productForm.name) {
        throw new Error("Product Name is required.");
      }
      if ((productForm.buyingPrice || 0) < 0 || (productForm.sellingPrice || 0) < 0) {
        throw new Error("Prices cannot be negative.");
      }
      if ((productForm.stockQuantity || 0) < 0) {
        throw new Error("Initial stock cannot be negative.");
      }

      const storeId = selectedStoreId === 'ALL' ? (stores[0]?.id || '') : selectedStoreId;
      if (!storeId) throw new Error("Please select or create a store first.");

      // Remove id from payload to prevent Firestore update errors
      const { id, ...data } = productForm;
      const payload = {
        ...data,
        userId: userProfile?.ownerId || user?.uid,
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
      const msg = err instanceof Error ? err.message : "Failed to save product";
      setGlobalError(msg);
      handleFirestoreError(err, editingProduct ? OperationType.UPDATE : OperationType.CREATE, 'products');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSale = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setGlobalError(null);
    try {
      if (!saleForm.productId) throw new Error("Please select a product.");
      const product = products.find(p => p.id === saleForm.productId);
      if (!product) throw new Error("Product not found.");
      
      if (!saleForm.quantity || saleForm.quantity <= 0) throw new Error("Quantity must be greater than 0.");
      if (saleForm.quantity > product.stockQuantity) throw new Error(`Insufficient stock. Available: ${product.stockQuantity}`);

      const storeId = selectedStoreId === 'ALL' ? (stores[0]?.id || '') : selectedStoreId;
      if (!storeId) throw new Error("Please select or create a store first.");
      
      const ownerId = userProfile?.ownerId || user?.uid;
      if (!ownerId) throw new Error("User identity not verified.");

      const batch = writeBatch(db);
      const newSaleDocRef = doc(collection(db, 'sales'));
      
      const quantityValue = Number(saleForm.quantity) || 0;
      const discountValue = Number(saleForm.discount) || 0;
      const sellingPriceValue = Number(product.sellingPrice) || 0;
      const buyingPriceValue = Number(product.buyingPrice) || 0;

      if (isNaN(quantityValue) || isNaN(discountValue) || isNaN(sellingPriceValue) || isNaN(buyingPriceValue)) {
        throw new Error("Invalid numeric values detected in sale data.");
      }

      const saleData = { 
        ...saleForm, 
        userId: ownerId,
        storeId,
        quantity: quantityValue,
        discount: discountValue,
        sellingPrice: sellingPriceValue,
        buyingPrice: buyingPriceValue,
        paymentMethod: saleForm.paymentMethod || 'Cash'
      };
      
      batch.set(newSaleDocRef, saleData);
      
      // Update stock safely
      const productDocRef = doc(db, 'products', product.id);
      const newStock = (Number(product.stockQuantity) || 0) - quantityValue;
      if (isNaN(newStock)) throw new Error("Invalid stock calculation.");
      
      batch.update(productDocRef, { 
        stockQuantity: newStock
      });

      await batch.commit();

      setSaleForm({ date: format(new Date(), 'yyyy-MM-dd'), productId: '', quantity: undefined, discount: undefined, paymentMethod: 'Cash' });
      setIsSaleModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add sale";
      setGlobalError(msg);
      handleFirestoreError(err, OperationType.CREATE, 'sales');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddExpense = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setGlobalError(null);
    try {
      if (!expenseForm.amount || expenseForm.amount <= 0) throw new Error("Amount must be greater than 0.");
      if (!expenseForm.description) throw new Error("Description is required.");

      const storeId = selectedStoreId === 'ALL' ? (stores[0]?.id || '') : selectedStoreId;
      if (!storeId) throw new Error("Please select or create a store first.");

      const colRef = collection(db, 'expenses');
      const newDocRef = doc(colRef);
      await setDoc(newDocRef, { 
        ...expenseForm, 
        userId: userProfile?.ownerId || user?.uid,
        storeId,
        amount: expenseForm.amount || 0
      });
      setExpenseForm({ date: format(new Date(), 'yyyy-MM-dd'), description: '', category: 'Other', amount: undefined });
      setIsExpenseModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add expense";
      setGlobalError(msg);
      handleFirestoreError(err, OperationType.CREATE, 'expenses');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRestock = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setGlobalError(null);
    try {
      if (!restockForm.productId) throw new Error("Please select a product.");
      const product = products.find(p => p.id === restockForm.productId);
      if (!product) throw new Error("Product not found.");

      if (!restockForm.quantity || restockForm.quantity <= 0) throw new Error("Quantity must be greater than 0.");
      if (restockForm.unitCost && restockForm.unitCost < 0) throw new Error("Unit cost cannot be negative.");

      const storeId = selectedStoreId === 'ALL' ? (stores[0]?.id || '') : selectedStoreId;
      if (!storeId) throw new Error("Please select or create a store first.");

      const batch = writeBatch(db);
      const colRef = collection(db, 'restocks');
      const newDocRef = doc(colRef);
      batch.set(newDocRef, { 
        ...restockForm, 
        userId: userProfile?.ownerId || user?.uid,
        storeId,
        quantity: restockForm.quantity || 0,
        unitCost: restockForm.unitCost || product.buyingPrice 
      });
      
      const productDocRef = doc(db, 'products', product.id);
      batch.update(productDocRef, { 
        stockQuantity: product.stockQuantity + (restockForm.quantity || 0) 
      });

      await batch.commit();

      setRestockForm({ date: format(new Date(), 'yyyy-MM-dd'), productId: '', quantity: undefined, unitCost: undefined });
      setIsRestockModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add restock";
      setGlobalError(msg);
      handleFirestoreError(err, OperationType.CREATE, 'restocks');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAlert = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setGlobalError(null);
    try {
      if (!alertForm.name) throw new Error("Alert name is required.");
      if (alertForm.threshold === undefined || alertForm.threshold < 0) throw new Error("Threshold must be 0 or greater.");

      const storeId = selectedStoreId === 'ALL' ? (stores[0]?.id || '') : selectedStoreId;
      if (!storeId) throw new Error("Please select or create a store first.");

      const colRef = collection(db, 'alertRules');
      const newDocRef = doc(colRef);
      await setDoc(newDocRef, { 
        ...alertForm, 
        userId: userProfile?.ownerId || user?.uid,
        storeId,
        threshold: alertForm.threshold || 0,
        createdAt: new Date().toISOString()
      });
      setAlertForm({ name: '', type: 'LOW_STOCK', threshold: undefined, isActive: true });
      setIsAlertModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add alert";
      setGlobalError(msg);
      handleFirestoreError(err, OperationType.CREATE, 'alertRules');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddClient = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setGlobalError(null);
    try {
      if (!clientForm.name) throw new Error("Client name is required.");

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
          userId: userProfile?.ownerId || user?.uid,
          storeId,
          totalDebt: clientForm.totalDebt || 0,
          createdAt: new Date().toISOString()
        });
      }
      setClientForm({ name: '', phone: '', totalDebt: undefined });
      setIsClientModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save client";
      setGlobalError(msg);
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
        setGlobalError(null);
        try {
          const batch = writeBatch(db);
          batch.delete(doc(db, 'clients', clientId));
          
          // Delete related transactions
          clientTransactions.filter(t => t.clientId === clientId).forEach(t => {
            batch.delete(doc(db, 'clientTransactions', t.id));
          });

          await batch.commit();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to delete client";
          setGlobalError(msg);
          handleFirestoreError(err, OperationType.DELETE, `clients/${clientId}`);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const handleAddClientTransaction = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setGlobalError(null);
    try {
      if (!selectedClient) throw new Error("Please select a client first.");
      if (!clientTransactionForm.amount || clientTransactionForm.amount <= 0) throw new Error("Amount must be greater than 0.");
      if (clientTransactionForm.type === 'CREDIT' && clientTransactionForm.productId) {
        const product = products.find(p => p.id === clientTransactionForm.productId);
        if (product && (clientTransactionForm.quantity || 0) > product.stockQuantity) {
          throw new Error(`Insufficient stock. Available: ${product.stockQuantity}`);
        }
      }

      const storeId = selectedStoreId === 'ALL' ? (stores[0]?.id || '') : selectedStoreId;
      if (!storeId) throw new Error("Please select or create a store first.");

      const batch = writeBatch(db);
      const colRef = collection(db, 'clientTransactions');
      const newDocRef = doc(colRef);
      const transactionData: any = {
        date: clientTransactionForm.date || format(new Date(), 'yyyy-MM-dd'),
        type: clientTransactionForm.type || 'CREDIT',
        description: clientTransactionForm.description || '',
        userId: userProfile?.ownerId || user?.uid,
        storeId,
        amount: Number(clientTransactionForm.amount) || 0,
        clientId: selectedClient.id
      };
      
      if (clientTransactionForm.productId) {
        transactionData.productId = clientTransactionForm.productId;
      }
      
      if (clientTransactionForm.quantity !== undefined && clientTransactionForm.quantity !== null) {
        transactionData.quantity = Number(clientTransactionForm.quantity);
      }
      
      batch.set(newDocRef, transactionData);
      
      // Update client debt
      const debtChange = clientTransactionForm.type === 'CREDIT' ? (clientTransactionForm.amount || 0) : -(clientTransactionForm.amount || 0);
      const clientDocRef = doc(db, 'clients', selectedClient.id);
      batch.update(clientDocRef, { 
        totalDebt: selectedClient.totalDebt + debtChange 
      });

      // Update product stock if linked
      if (clientTransactionForm.type === 'CREDIT' && clientTransactionForm.productId && clientTransactionForm.quantity) {
        const product = products.find(p => p.id === clientTransactionForm.productId);
        if (product) {
          const productDocRef = doc(db, 'products', product.id);
          batch.update(productDocRef, { 
            stockQuantity: product.stockQuantity - (clientTransactionForm.quantity || 0) 
          });
        }
      }
      
      await batch.commit();
      
      setClientTransactionForm({
        date: format(new Date(), 'yyyy-MM-dd'), 
        type: 'CREDIT', 
        amount: undefined, 
        description: '', 
        clientId: '', 
      });
      setIsClientTransactionModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to record transaction";
      setGlobalError(msg);
      handleFirestoreError(err, OperationType.CREATE, 'clientTransactions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddQuotation = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setGlobalError(null);
    try {
      if (!quotationForm.clientName) throw new Error("Client name is required.");
      if (!quotationForm.items || quotationForm.items.length === 0) throw new Error("At least one item is required.");

      const storeId = selectedStoreId === 'ALL' ? (stores[0]?.id || '') : selectedStoreId;
      if (!storeId) throw new Error("Please select or create a store first.");

      const colRef = collection(db, 'quotations');
      const newDocRef = doc(colRef);
      
      // We don't create a client or debt for quotations yet, 
      // as they are just estimates until converted.
      await setDoc(newDocRef, {
        ...quotationForm,
        userId: userProfile?.ownerId || user?.uid,
        storeId,
      });

      setQuotationForm({
        clientName: '',
        clientId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        items: [],
        status: 'Draft',
        totalAmount: 0
      });
      setIsQuotationModalOpen(false);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to save quotation");
      handleFirestoreError(err, OperationType.CREATE, 'quotations');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddInvoice = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setGlobalError(null);
    try {
      if (!invoiceForm.clientName) throw new Error("Client name is required.");
      if (!invoiceForm.items || invoiceForm.items.length === 0) throw new Error("At least one item is required.");

      const storeId = selectedStoreId === 'ALL' ? (stores[0]?.id || '') : selectedStoreId;
      if (!storeId) throw new Error("Please select or create a store first.");

      const userId = userProfile?.ownerId || user?.uid;
      const batch = writeBatch(db);
      
      let finalClientId = invoiceForm.clientId;

      // 1. Check if client exists, if not create one
      if (!finalClientId) {
        const clientRef = doc(collection(db, 'clients'));
        finalClientId = clientRef.id;
        batch.set(clientRef, {
          name: invoiceForm.clientName,
          email: '',
          phone: 'N/A', // Required by rules
          address: '',
          totalDebt: 0,
          userId,
          storeId,
          createdAt: format(new Date(), 'yyyy-MM-dd') // Required by rules
        });
      }

      const colRef = collection(db, 'invoices');
      const newDocRef = doc(colRef);
      const invoiceData = {
        ...invoiceForm,
        clientId: finalClientId,
        userId,
        storeId,
      };
      
      batch.set(newDocRef, invoiceData);

      // 2. Add to client ledger and update debt
      const balance = (invoiceForm.totalAmount || 0) - (invoiceForm.paidAmount || 0);
      if (balance > 0) {
        batch.update(doc(db, 'clients', finalClientId), {
          totalDebt: increment(balance)
        });
        
        const transRef = doc(collection(db, 'clientTransactions'));
        batch.set(transRef, {
          date: format(new Date(), 'yyyy-MM-dd'),
          type: 'CREDIT',
          amount: balance,
          description: `Invoice generated: #${newDocRef.id.slice(0, 5)}`,
          clientId: finalClientId,
          userId,
          storeId
        });
      }

      await batch.commit();

      setInvoiceForm({
        clientName: '',
        clientId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        items: [],
        status: 'Pending',
        totalAmount: 0,
        paidAmount: 0
      });
      setIsInvoiceModalOpen(false);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to save invoice");
      handleFirestoreError(err, OperationType.CREATE, 'invoices');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvertQuotationToInvoice = async (quotation: Quotation) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const colRef = collection(db, 'invoices');
      const newDocRef = doc(colRef);
      const userId = quotation.userId;
      const storeId = quotation.storeId;
      
      let finalClientId = quotation.clientId;

      // 1. Create client if it doesn't exist
      if (!finalClientId) {
        const clientRef = doc(collection(db, 'clients'));
        finalClientId = clientRef.id;
        batch.set(clientRef, {
          name: quotation.clientName,
          email: '',
          phone: 'N/A', // Required by rules
          address: '',
          totalDebt: 0,
          userId,
          storeId,
          createdAt: format(new Date(), 'yyyy-MM-dd') // Required by rules
        });
      }

      const invoiceData = {
        clientName: quotation.clientName,
        clientId: finalClientId || '',
        date: format(new Date(), 'yyyy-MM-dd'),
        items: quotation.items,
        totalAmount: quotation.totalAmount,
        paidAmount: 0,
        status: 'Pending',
        userId,
        storeId
      };
      
      batch.set(newDocRef, invoiceData);
      
      // 2. Update quotation status
      batch.update(doc(db, 'quotations', quotation.id), { status: 'Accepted' });
      
      // 3. Update client debt and ledger
      batch.update(doc(db, 'clients', finalClientId), {
        totalDebt: increment(quotation.totalAmount)
      });
      
      const transRef = doc(collection(db, 'clientTransactions'));
      batch.set(transRef, {
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'CREDIT',
        amount: quotation.totalAmount,
        description: `Invoice generated from Quotation #${quotation.id.slice(0, 5)}`,
        clientId: finalClientId,
        userId,
        storeId
      });
      
      await batch.commit();
      setDocumentSubTab('INVOICES');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'invoices');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayInvoice = async (invoice: Invoice) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Update Invoice Status
      batch.update(doc(db, 'invoices', invoice.id), { 
        status: 'Paid',
        paidAmount: invoice.totalAmount
      });
      
      // 2. Reduce Client Debt if linked
      if (invoice.clientId) {
        const client = clients.find(c => c.id === invoice.clientId);
        if (client) {
          batch.update(doc(db, 'clients', client.id), {
            totalDebt: Math.max(0, (client.totalDebt || 0) - invoice.totalAmount)
          });
          
          // Add payment transaction
          const transRef = doc(collection(db, 'clientTransactions'));
          batch.set(transRef, {
            date: format(new Date(), 'yyyy-MM-dd'),
            type: 'PAYMENT',
            amount: invoice.totalAmount,
            description: `Payment for Invoice #${invoice.id.slice(0, 5)}`,
            clientId: client.id,
            userId: invoice.userId,
            storeId: invoice.storeId
          });
        }
      }
      
      // 3. Create Sale records and update Stock for each item
      for (const item of invoice.items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const saleRef = doc(collection(db, 'sales'));
          batch.set(saleRef, {
            date: format(new Date(), 'yyyy-MM-dd'),
            productId: item.productId,
            quantity: item.quantity,
            sellingPrice: item.price,
            buyingPrice: product.buyingPrice,
            discount: 0,
            paymentMethod: 'Cash',
            userId: invoice.userId,
            storeId: invoice.storeId
          });
          
          batch.update(doc(db, 'products', product.id), {
            stockQuantity: product.stockQuantity - item.quantity
          });
        }
      }
      
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `invoices/${invoice.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetupOtp = async () => {
    if (!user) return;
    setIsLoggingIn(true);
    try {
      const response = await fetch('/api/otp/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      const data = await response.json();
      setOtpQrCode(data.qrCodeUrl);
      setOtpSecretRaw(data.encryptedSecret);
      setOtpSetupStep('QR');
    } catch (err) {
      console.error("OTP Setup Failed:", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleConfirmOtpSetup = async () => {
    if (!otpToken || !user) return;
    setIsLoggingIn(true);
    setOtpVerifyError('');
    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: otpToken, encryptedSecret: otpSecretRaw })
      });
      const data = await response.json();
      if (data.success) {
        await updateDoc(doc(db, 'users', user.uid), {
          otpEnabled: true,
          otpSecret: otpSecretRaw
        });
        if (userProfile) setUserProfile({ ...userProfile, otpEnabled: true, otpSecret: otpSecretRaw });
        setOtpSetupStep('INITIAL');
        setOtpToken('');
      } else {
        setOtpVerifyError(data.error);
      }
    } catch (err) {
      setOtpVerifyError("VERIFICATION FAILED");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDisableOtp = async () => {
    if (!user || !userProfile) return;
    if (!window.confirm("ARE YOU SURE YOU WANT TO DISABLE TWO-FACTOR AUTHENTICATION? THIS REDUCES ACCOUNT SECURITY.")) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        otpEnabled: false,
        otpSecret: null
      });
      setUserProfile({ ...userProfile, otpEnabled: false, otpSecret: undefined });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  const handleAddStaff = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setGlobalError(null);
    try {
      if (editingStaff) {
        const docRef = doc(db, 'users', editingStaff.id);
        await updateDoc(docRef, staffForm);
        setEditingStaff(null);
      } else {
        // Use email as ID for pre-authorized staff so they can be found on first login
        const docRef = doc(db, 'users', staffForm.email.toLowerCase());
        await setDoc(docRef, {
          ...staffForm,
          ownerId: userProfile?.ownerId || user?.uid // Link staff to the owner of this account
        });
      }
      setStaffForm({ email: '', role: 'employee', displayName: '', assignedStoreIds: [], tempPassword: '' });
      setIsStaffModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save staff";
      setGlobalError(msg);
      handleFirestoreError(err, editingStaff ? OperationType.UPDATE : OperationType.CREATE, 'users');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStore = async () => {
    if (!storeForm.name.trim()) {
      setGlobalError("Store Name is required.");
      return;
    }
    
    if (isSubmitting) return;
    setIsSubmitting(true);
    setGlobalError(null);
    try {
      if (editingStore) {
        const docRef = doc(db, 'stores', editingStore.id);
        await updateDoc(docRef, storeForm);
        setEditingStore(null);
      } else {
        const colRef = collection(db, 'stores');
        const newDocRef = doc(colRef);
        await setDoc(newDocRef, { 
          ...storeForm, 
          userId: userProfile?.ownerId || user?.uid,
          createdAt: new Date().toISOString() 
        });
      }
      setStoreForm({ name: '', location: '' });
      setIsStoreModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save store";
      setGlobalError(msg);
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
        setGlobalError(null);
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
          const msg = err instanceof Error ? err.message : "Failed to delete store";
          setGlobalError(msg);
          handleFirestoreError(err, OperationType.DELETE, `stores/${storeId}`);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
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
        setGlobalError(null);
        try {
          await deleteDoc(doc(db, 'users', staffId));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to remove staff";
          setGlobalError(msg);
          handleFirestoreError(err, OperationType.DELETE, `users/${staffId}`);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
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
      message: 'Are you sure you want to delete this product? This will remove it from the inventory permanently along with its history.',
      onConfirm: async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setGlobalError(null);
        try {
          const batch = writeBatch(db);
          batch.delete(doc(db, 'products', productId));
          
          // Delete related sales and restocks
          sales.filter(s => s.productId === productId).forEach(s => batch.delete(doc(db, 'sales', s.id)));
          restocks.filter(r => r.productId === productId).forEach(r => batch.delete(doc(db, 'restocks', r.id)));

          await batch.commit();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to delete product";
          setGlobalError(msg);
          handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const handleMarkAllAlertsRead = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      triggeredAlerts.filter(a => !a.isRead).forEach(a => {
        batch.update(doc(db, 'triggeredAlerts', a.id), { isRead: true });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'triggeredAlerts');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearAllAlerts = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'CLEAR INCIDENTS',
      message: 'Are you sure you want to clear all active incidents? This action cannot be undone.',
      onConfirm: async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
          const batch = writeBatch(db);
          triggeredAlerts.forEach(a => {
            batch.delete(doc(db, 'triggeredAlerts', a.id));
          });
          await batch.commit();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, 'triggeredAlerts');
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setGlobalError(null);
    try {
      await deleteDoc(doc(db, 'alertRules', alertId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete alert";
      setGlobalError(msg);
      handleFirestoreError(err, OperationType.DELETE, `alertRules/${alertId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAlert = async (alert: AlertRule) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setGlobalError(null);
    try {
      const docRef = doc(db, 'alertRules', alert.id);
      await updateDoc(docRef, { isActive: !alert.isActive });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to toggle alert";
      setGlobalError(msg);
      handleFirestoreError(err, OperationType.UPDATE, `alertRules/${alert.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const dateStr = format(parseISO(reportDate), 'MMMM dd, yyyy');
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(10, 132, 255); // Rowina Blue
    doc.text('ROWINA SALES TRACKER', 105, 20, { align: 'center' });
    
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
      headStyles: { fillColor: [10, 132, 255] }
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

    doc.save(`Rowina_Report_${reportDate}.pdf`);
  };

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const provider = new GoogleAuthProvider();
      // In PWA/Standalone mode, popups are often blocked. 
      // We could use redirect, but it requires more config.
      // For now, we'll try popup and provide a better error if it fails.
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login error details:", error);
      if (error.code === 'auth/popup-blocked') {
        setLoginError("POPUP BLOCKED. PLEASE ALLOW POPUPS OR USE EMAIL.");
      } else if (error.code === 'auth/unauthorized-domain') {
        setLoginError("UNAUTHORIZED DOMAIN. PLEASE ADD TO FIREBASE CONSOLE.");
      } else if (isStandalone) {
        setLoginError("GOOGLE SIGN-IN IS RESTRICTED IN PWA MODE. PLEASE USE EMAIL.");
      } else if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, no need for error message
      } else {
        setLoginError("GOOGLE SIGN-IN FAILED. TRY EMAIL.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    
    const email = emailForm.email.trim().toLowerCase();
    const password = emailForm.password;
    
    if (!email || (authMode === 'login' ? !password : !password || !emailForm.username)) {
      setLoginError("ALL FIELDS REQUIRED");
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    const emailLower = email.trim().toLowerCase();

    try {
      if (authMode === 'login') {
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, emailLower, password);
        } catch (error: any) {
          // Check if this is a staff bypass case
          const staffDocPath = doc(db, 'users', emailLower);
          const staffDoc = await getDoc(staffDocPath);
          
          if (staffDoc.exists() && staffDoc.data()?.tempPassword === password) {
            try {
              userCredential = await createUserWithEmailAndPassword(auth, emailLower, password);
              if (staffDoc.data()?.displayName) {
                await updateProfile(userCredential.user, { displayName: staffDoc.data().displayName });
              }
            } catch (createErr: any) {
              if (createErr.code === 'auth/email-already-in-use') {
                // Account exists but password was wrong. 
                // We don't want to re-create, so we just throw if the bypass password doesn't match the one they typed
                // (which we already checked, so this means the Auth password is different)
                setLoginError("INVALID ACCOUNT DETAILS (Password mismatch)");
                console.error("Auth exists but password mismatch with bypass data");
                return;
              }
              throw createErr;
            }
          } else {
            // No bypass match and signIn failed
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
              setLoginError("INVALID ACCOUNT DETAILS");
            } else {
              setLoginError(error.message || "LOGIN FAILED");
            }
            return;
          }
        }
        
        // 2FA Check Logic
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists() && userDoc.data()?.otpEnabled) {
          setPendingUser(userCredential.user);
          setRequiresOtp(true);
          setIsLoggingIn(false);
          return; // Don't close auth screen yet, wait for OTP
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: emailForm.username });
      }
      setShowAuthScreen(false);
    } catch (error: any) {
      console.error("Email auth failed:", error);
      if (error.code === 'auth/network-request-failed' || !navigator.onLine) {
        setLoginError("NETWORK ERROR: PLEASE CHECK YOUR CONNECTION OR DISABLE AD-BLOCKERS");
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setLoginError("INVALID ACCOUNT DETAILS");
      } else if (error.code === 'auth/email-already-in-use') {
        setLoginError("EMAIL ALREADY IN USE");
      } else if (error.code === 'auth/too-many-requests') {
        setLoginError("TOO MANY ATTEMPTS. TRY AGAIN LATER.");
      } else {
        setLoginError(error.message?.toUpperCase().replace('FIREBASE: ', '') || "AUTHENTICATION FAILED");
      }
    } finally {
      if (!requiresOtp) setIsLoggingIn(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpToken || otpToken.length !== 6 || !pendingUser) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const userDoc = await getDoc(doc(db, 'users', pendingUser.uid));
      const encryptedSecret = userDoc.data()?.otpSecret;

      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: otpToken, encryptedSecret })
      });

      const data = await response.json();
      if (data.success) {
        setShowAuthScreen(false);
        setRequiresOtp(false);
        setPendingUser(null);
        setOtpToken('');
      } else {
        setLoginError(data.error || "INVALID OTP CODE");
      }
    } catch (err) {
      console.error("OTP Verification Error:", err);
      if (!navigator.onLine) {
        setLoginError("NETWORK DISCONNECTED. CHECK CONNECTION.");
      } else {
        setLoginError("VERIFICATION FAILED. CHECK CODE OR CONNECTION.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!emailForm.email) {
      setLoginError("ENTER YOUR EMAIL FIRST");
      return;
    }
    setIsLoggingIn(true);
    try {
      await sendPasswordResetEmail(auth, emailForm.email);
      setResetSent(true);
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/network-request-failed' || !navigator.onLine) {
        setLoginError("NETWORK ERROR. CHECK CONNECTION.");
      } else if (err.code === 'auth/invalid-login-credentials' || err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setLoginError("INVALID EMAIL OR PASSWORD.");
      } else if (err.code === 'auth/email-already-in-use') {
        setLoginError("EMAIL ALREADY REGISTERED.");
      } else if (err.code === 'auth/weak-password') {
        setLoginError("PASSWORD TOO WEAK.");
      } else {
        setLoginError(err.message.toUpperCase().replace('FIREBASE: ', ''));
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
      setShowAuthScreen(false);
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

  const handleForgotLock = () => {
    localStorage.removeItem('rowina_lock_config');
    setAppLockConfig({ type: null, value: null });
    setIsAppLocked(false);
    handleLogout();
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
      setShowAuthScreen(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-rowina-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-rowina-blue border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="rowina-mono text-zinc-500 text-xs tracking-widest uppercase">Initializing Rowina Systems...</p>
        </div>
      </div>
    );
  }

  if (isAuthReady && !user && showAuthScreen) {
    return (
      <div className="min-h-screen bg-rowina-black flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="max-w-md w-full py-12 space-y-12 text-center">
          <div className="space-y-4 relative">
            {(showInstallButton || (isIOS && !isStandalone)) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleInstallClick}
                className="absolute -top-12 right-0 sm:-right-8 bg-zinc-900 border border-zinc-800 p-3 rounded-2xl text-rowina-blue hover:scale-105 transition-all active:scale-95 shadow-xl"
                title="Install App"
              >
                <Download size={20} />
              </motion.button>
            )}
            <h1 className="text-6xl sm:text-8xl rowina-title font-bold text-white tracking-tight">Rowina<br />Finance</h1>
            <p className="rowina-mono text-zinc-500 text-xs tracking-[0.4em] uppercase font-bold">Secure Core v2.0</p>
          </div>
          
          <div className="bg-rowina-gray p-8 sm:p-10 rounded-[48px] border border-zinc-800 shadow-2xl">
            <div className="space-y-10">
              {requiresOtp ? (
                <div className="space-y-8">
                  <div className="space-y-2 text-center">
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Login Code</h2>
                    <p className="text-zinc-500 text-sm">Enter the code from your Authenticator app.</p>
                  </div>
                  <div className="space-y-6">
                    <input 
                      type="number"
                      placeholder="000000"
                      value={otpToken}
                      onChange={e => setOtpToken(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                      className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-5 text-center text-3xl tracking-[0.3em] focus:border-rowina-blue outline-none transition-all placeholder:text-zinc-800"
                      autoFocus
                    />
                    {loginError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-center">
                        <p className="text-rose-500 text-[10px] rowina-mono font-bold uppercase tracking-widest">{loginError}</p>
                      </div>
                    )}
                    <button 
                      onClick={handleVerifyOtp}
                      disabled={isLoggingIn}
                      className="w-full py-5 rounded-2xl font-bold rowina-mono text-sm tracking-widest uppercase transition-all rowina-pill-active shadow-lg shadow-rowina-blue/20"
                    >
                      {isLoggingIn ? 'Verifying...' : 'Access Now'}
                    </button>
                    <button 
                      onClick={() => { setRequiresOtp(false); setPendingUser(null); setLoginError(null); }}
                      className="w-full text-[10px] rowina-mono text-zinc-600 uppercase tracking-widest hover:text-white transition-all text-center"
                    >
                      Cancel Verification
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2 text-center text-balance">
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
                      {isForgotPassword ? 'Reset Access' : (authMode === 'login' ? 'Secure Login' : 'Create Account')}
                    </h2>
                    <p className="text-zinc-500 text-sm">
                      {isForgotPassword 
                        ? "We'll send you a recovery link." 
                        : (authMode === 'login' ? 'Welcome back. Provide credentials below.' : 'Staff? Use your registered email. Others create a new ID.')}
                    </p>
                  </div>
                  
                  <form 
                    onSubmit={isForgotPassword ? (e) => { e.preventDefault(); handleForgotPassword(); } : handleEmailAuth} 
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      {isForgotPassword ? (
                        <input 
                          type="email"
                          placeholder="EMAIL ADDRESS"
                          value={emailForm.email}
                          onChange={e => setEmailForm({...emailForm, email: e.target.value})}
                          className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-5 text-sm focus:border-rowina-blue outline-none transition-all shadow-inner"
                          required
                        />
                      ) : (
                        <>
                          {authMode === 'signup' && (
                            <input 
                              type="text"
                              placeholder="FULL NAME"
                              value={emailForm.username}
                              onChange={e => setEmailForm({...emailForm, username: e.target.value})}
                              className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-5 text-sm focus:border-rowina-blue outline-none transition-all shadow-inner"
                              required
                            />
                          )}
                          <input 
                            type="email"
                            placeholder="EMAIL ADDRESS"
                            value={emailForm.email}
                            onChange={e => setEmailForm({...emailForm, email: e.target.value})}
                            className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-5 text-sm focus:border-rowina-blue outline-none transition-all shadow-inner"
                            required
                          />
                          <div className="relative">
                            <input 
                              type={showPassword ? "text" : "password"}
                              placeholder="AUTHENTICATION PASS"
                              value={emailForm.password}
                              onChange={e => setEmailForm({...emailForm, password: e.target.value})}
                              className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-5 text-sm focus:border-rowina-blue outline-none transition-all pr-12 shadow-inner"
                              required
                            />
                            <button 
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </>
                      )}
                      
                      {!isForgotPassword && authMode === 'login' && (
                        <div className="flex justify-end">
                          <button 
                            type="button"
                            onClick={() => setIsForgotPassword(true)}
                            className="text-[10px] rowina-mono text-zinc-600 hover:text-rowina-blue transition-all uppercase tracking-widest font-bold"
                          >
                            Lost Credentials?
                          </button>
                        </div>
                      )}
                    </div>

                    {loginError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-center">
                        <p className="text-rose-500 text-[10px] rowina-mono font-bold uppercase tracking-widest leading-relaxed">{loginError}</p>
                      </div>
                    )}

                    {resetSent && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
                        <p className="text-emerald-500 text-[10px] rowina-mono font-bold uppercase tracking-widest">Link Sent! Check Inbox.</p>
                      </div>
                    )}

                    <button 
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full py-5 rounded-2xl font-bold rowina-mono text-sm tracking-widest uppercase transition-all rowina-pill-active shadow-lg shadow-rowina-blue/20"
                    >
                      {isLoggingIn 
                        ? (isForgotPassword ? 'Sending...' : 'Initializing...') 
                        : (isForgotPassword ? 'Send Recovery Link' : (authMode === 'login' ? 'Access Now' : 'Sign Up'))}
                    </button>
                  </form>
                  
                  {isForgotPassword && (
                    <button 
                      onClick={() => { setIsForgotPassword(false); setResetSent(false); }}
                      className="w-full text-[10px] rowina-mono text-zinc-600 hover:text-white uppercase tracking-widest text-center"
                    >
                      ← Back to Login
                    </button>
                  )}
                </>
              )}
            </div>

            {!requiresOtp && !isForgotPassword && (
              <div className="pt-10 border-t border-zinc-800/50 mt-10 space-y-6">
                <div className="flex items-center gap-4 text-zinc-800">
                  <div className="flex-1 h-[1px] bg-zinc-800" />
                  <span className="text-[10px] rowina-mono uppercase tracking-[0.4em]">External</span>
                  <div className="flex-1 h-[1px] bg-zinc-800" />
                </div>
                
                <button 
                  onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
                  className="w-full bg-zinc-900 border border-zinc-800 py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all text-[11px] font-bold rowina-mono uppercase tracking-[0.2em] text-zinc-300 shadow-inner"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5 grayscale opacity-50" />
                  Google Access
                </button>

                <div className="pt-4 flex flex-col gap-6">
                  <button 
                    onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setLoginError(null); }}
                    className="text-[10px] rowina-mono text-zinc-500 hover:text-white transition-all uppercase tracking-widest text-center"
                  >
                    {authMode === 'login' ? "Personnel Registry →" : "← Identification Login"}
                  </button>
                  
                  <button 
                    onClick={() => setShowAuthScreen(false)}
                    className="text-[10px] rowina-mono text-zinc-700 hover:text-zinc-500 transition-all uppercase tracking-widest text-center"
                  >
                    Guest Bypass
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <p className="text-[10px] rowina-mono text-zinc-700 uppercase tracking-widest">
            Authorized Personnel Only • Encrypted Session
          </p>
        </div>
      </div>
    );
  }

  if (isAppLocked && appLockConfig.type && user) {
    return (
      <div className="min-h-screen bg-rowina-black flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-12 text-center">
          <div className="space-y-4">
            <h1 className="text-6xl sm:text-8xl rowina-title font-bold text-white">Rowina<br />Sales</h1>
            <p className="rowina-mono text-zinc-500 text-xs tracking-[0.3em] uppercase">System Locked</p>
          </div>
          
          <div className="bg-rowina-gray p-8 rounded-[40px] border border-zinc-800 space-y-8">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-rowina-blue">
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
                className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-center text-2xl tracking-[0.5em] focus:border-rowina-blue outline-none transition-all"
                autoFocus
              />
              {lockError && <p className="text-rose-500 text-[10px] rowina-mono uppercase">{lockError}</p>}
              <button 
                onClick={handleUnlock}
                className="w-full bg-rowina-blue text-black py-4 rounded-2xl font-bold rowina-mono text-sm tracking-widest hover:scale-[1.02] transition-all"
              >
                UNLOCK
              </button>
            </div>
            
            <div className="flex flex-col gap-4 pt-4">
              <button 
                onClick={handleForgotLock}
                className="text-[10px] rowina-mono text-zinc-600 uppercase tracking-widest hover:text-rowina-blue transition-all"
              >
                Forgot {appLockConfig.type === 'pin' ? 'PIN' : 'Password'}? Reset via Logout
              </button>
              <button 
                onClick={handleLogout}
                className="text-[10px] rowina-mono text-zinc-500 uppercase tracking-widest hover:text-white transition-all"
              >
                Switch Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rowina-black text-zinc-100 p-6 md:p-12 max-w-2xl mx-auto pb-32">
      {/* Global Error Toast */}
      <AnimatePresence>
        {globalError && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-6"
          >
            <div className="bg-rose-500 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-rose-400">
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} />
                <p className="text-[10px] rowina-mono font-bold uppercase tracking-widest">{globalError}</p>
              </div>
              <button onClick={() => setGlobalError(null)} className="p-1 hover:bg-white/20 rounded-lg transition-all">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* PWA Install Button */}
      {(showInstallButton || (isIOS && !isStandalone)) && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleInstallClick}
          className="fixed bottom-24 right-6 z-50 bg-rowina-blue text-black px-6 py-4 rounded-full font-bold rowina-mono text-xs tracking-widest shadow-2xl shadow-rowina-blue/20 flex items-center gap-3 hover:scale-105 transition-all active:scale-95"
        >
          <Download size={18} />
          INSTALL ROWINA SALES
        </motion.button>
      )}

      {/* Header */}
      <header className="mb-12">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-4xl sm:text-6xl rowina-title font-bold">Rowina<br />Sales</h1>
          <div className="flex gap-4 items-start">
            <div className="flex flex-col gap-2">
              {stores.length > 0 && (
                <div className="relative">
                  <select 
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-[8px] rowina-mono text-zinc-300 focus:outline-none focus:border-rowina-blue transition-all appearance-none cursor-pointer pr-8"
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
                    "px-3 py-1 rounded-full text-[8px] rowina-mono transition-all",
                    userRole === 'employee' ? "bg-zinc-700 text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  EMPLOYEE
                </button>
                <button 
                  onClick={() => handleRoleSwitch('executive')}
                  className={cn(
                    "px-3 py-1 rounded-full text-[8px] rowina-mono transition-all",
                    userRole === 'executive' ? "bg-rowina-blue text-black font-bold" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  EXECUTIVE
                </button>
              </div>
              <select 
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1 text-[8px] rowina-mono text-zinc-300 focus:outline-none focus:border-rowina-blue transition-all appearance-none cursor-pointer text-center"
              >
                {EAST_AFRICAN_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <button 
                onClick={() => requireAuth(() => setActiveTab('alerts'))}
                className={cn(
                  "w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center transition-all",
                  triggeredAlerts.some(a => !a.isRead) ? "text-rowina-blue border-rowina-blue animate-pulse" : "text-zinc-500 hover:text-white hover:border-zinc-600"
                )}
              >
                <Bell size={24} />
              </button>
              {triggeredAlerts.some(a => !a.isRead) && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-rowina-blue rounded-full border-2 border-rowina-black" />
              )}
            </div>
            {appLockConfig.type && (
              <button 
                onClick={() => requireAuth(() => setIsAppLocked(true))}
                className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-rowina-blue hover:border-rowina-blue transition-all"
                title="Lock App"
              >
                <Lock size={24} />
              </button>
            )}
            <button 
              onClick={() => setActiveTab('help')}
              className={cn(
                "w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center transition-all",
                activeTab === 'help' ? "text-rowina-blue border-rowina-blue" : "text-zinc-500 hover:text-white hover:border-zinc-600"
              )}
              title="User Guide"
            >
              <HelpCircle size={24} />
            </button>
            {user ? (
              <button 
                onClick={handleLogout}
                className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-rowina-blue hover:border-rowina-blue transition-all"
                title="Logout"
              >
                <LogOut size={24} />
              </button>
            ) : (
              <button 
                onClick={() => setShowAuthScreen(true)}
                className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center text-rowina-blue border-rowina-blue animate-pulse transition-all"
                title="Login"
              >
                <LogIn size={24} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-rowina-gray rounded-2xl p-1.5 flex mb-12 border border-zinc-800/50 gap-2 overflow-x-auto no-scrollbar items-center">
        {[
          { id: 'portfolio', label: 'PORTFOLIO' },
          { id: 'store', label: 'STORE' },
          { id: 'clients', label: 'CLIENTS' },
          { id: 'calendar', label: 'CALENDAR' },
          { id: 'documents', label: 'DOCUMENTS' },
          { id: 'reports', label: 'REPORTS' },
          { id: 'alerts', label: 'ALERTS' },
          { id: 'staff', label: 'STAFF' },
          { id: 'stores', label: 'STORES' },
          { id: 'security', label: 'SECURITY' },
          { id: 'help', label: 'HELP' },
        ].filter(tab => userRole === 'executive' || (tab.id !== 'alerts' && tab.id !== 'staff' && tab.id !== 'stores')).map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (['alerts', 'staff', 'stores', 'security'].includes(tab.id)) {
                requireAuth(() => setActiveTab(tab.id as Tab));
              } else {
                setActiveTab(tab.id as Tab);
              }
            }}
            className={cn(
              "flex-shrink-0 py-2 rounded-xl text-[9px] sm:text-[10px] font-bold rowina-mono transition-all duration-300 whitespace-nowrap px-3 sm:px-4",
              activeTab === tab.id 
                ? "rowina-pill-active" 
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
                <h2 className="text-2xl font-bold rowina-title">
                  {timePeriod === 'daily' ? "Today's Overview" : "Portfolio Overview"}
                </h2>
                <p className="rowina-mono text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                  {timePeriod === 'daily' ? format(new Date(), 'MMMM dd, yyyy') : 'Aggregate Performance'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none">
                  <select 
                    value={timePeriod}
                    onChange={(e) => setTimePeriod(e.target.value as any)}
                    className="w-full bg-rowina-gray border border-zinc-800 rounded-2xl px-4 py-2 text-[10px] rowina-mono font-bold text-zinc-400 focus:text-white focus:border-rowina-blue outline-none appearance-none cursor-pointer transition-all uppercase pr-8"
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
                    className="w-full bg-rowina-gray border border-zinc-800 rounded-2xl px-4 py-2 text-[10px] rowina-mono font-bold text-zinc-400 focus:text-white focus:border-rowina-blue outline-none appearance-none cursor-pointer transition-all uppercase pr-8"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <div className="bg-rowina-gray p-5 sm:p-6 rounded-[32px] border border-zinc-800 relative min-h-[110px] flex flex-col justify-between sm:col-span-2 lg:col-span-1">
                    <p className="rowina-mono text-[10px] text-zinc-500 uppercase tracking-widest">Profit Margin</p>
                    <div className="mt-2">
                      <p className="text-3xl sm:text-4xl font-bold tracking-tight text-white">{stats.current.margin.toFixed(1)}%</p>
                    </div>
                    <div className={cn(
                      "absolute bottom-5 right-6 flex items-center gap-1 rowina-mono text-[10px] font-bold",
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
            <div className="bg-rowina-gray border border-zinc-800 p-6 rounded-3xl space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="rowina-mono text-xs font-bold text-rowina-blue tracking-widest uppercase">Last 7 Days</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rowina-blue" />
                    <span className="text-[8px] rowina-mono text-zinc-500 uppercase">Sales</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-600" />
                    <span className="text-[8px] rowina-mono text-zinc-500 uppercase">Expenses</span>
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
                    <Bar dataKey="sales" fill="#0A84FF" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="expenses" fill="#333" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4 mt-8">
              <div className="flex justify-between items-center">
                <h3 className="rowina-mono text-xs font-bold text-zinc-500 uppercase tracking-widest">Recent Activity</h3>
                <div className="flex gap-2">
                  <button onClick={() => requireAuth(() => setIsSaleModalOpen(true))} className="text-[10px] rowina-mono text-rowina-blue border border-rowina-blue/30 px-3 py-1 rounded-full hover:bg-rowina-blue/10 transition-all">ADD SALE</button>
                  <button onClick={() => requireAuth(() => setIsExpenseModalOpen(true))} className="text-[10px] rowina-mono text-zinc-500 border border-zinc-800 px-3 py-1 rounded-full hover:bg-white/5 transition-all">ADD EXPENSE</button>
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
                          isSale ? "bg-rowina-blue/10 text-rowina-blue" : 
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
                          <p className="rowina-mono text-[8px] text-zinc-600">
                            {format(parseISO(item.date), 'MMM dd, yyyy')}
                            {isSale && (
                              <>
                                <span className="ml-2">• QTY: {item.quantity}</span>
                                <span className="ml-2 text-rowina-blue/60">• {(item as Sale).paymentMethod?.toUpperCase()}</span>
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
                        isSale ? "text-rowina-blue" : 
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
                  <h2 className="text-2xl font-bold rowina-title">Stock Store</h2>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => requireAuth(() => {
                        setRestockForm({ date: format(new Date(), 'yyyy-MM-dd'), productId: '', quantity: 0, unitCost: 0 });
                        setModalSearch('');
                        setIsRestockModalOpen(true);
                      })}
                      className="text-[10px] rowina-mono text-emerald-500 border border-emerald-500/30 px-4 py-2 rounded-full hover:bg-emerald-500/10 transition-all flex items-center gap-2"
                    >
                      <Package size={14} /> RESTOCK
                    </button>
                    <button 
                      onClick={() => requireAuth(() => setIsProductModalOpen(true))}
                      className="w-10 h-10 rounded-full rowina-pill-active flex items-center justify-center"
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
                    className="w-full bg-rowina-gray border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-xs rowina-mono focus:border-rowina-blue outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          className="bg-rowina-gray border border-zinc-800 p-6 rounded-3xl flex justify-between items-center group cursor-pointer hover:border-rowina-blue/50 transition-all"
                        >
                          <div>
                            <h4 className="font-bold text-white mb-1">{product.name}</h4>
                            <p className="rowina-mono text-[10px] text-zinc-500">{product.stockQuantity} {product.unit} REMAINING</p>
                            {userRole === 'executive' && (
                              <p className="rowina-mono text-[9px] text-emerald-500 mt-2">TOTAL PROFIT: {f(totalProfit)}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {userRole === 'executive' && (
                                <span className="text-[10px] rowina-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                                  {calculateMargin(product.buyingPrice, product.sellingPrice).toFixed(1)}%
                                </span>
                              )}
                              <p className="text-rowina-blue font-bold">{f(product.sellingPrice)}</p>
                            </div>
                            <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); requireAuth(() => { setEditingProduct(product); setProductForm(product); setIsProductModalOpen(true); }); }} className="text-zinc-500 hover:text-white"><Edit3 size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); requireAuth(() => handleDeleteProduct(product.id)); }} className="text-zinc-500 hover:text-rose-500"><Trash2 size={14} /></button>
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
                    className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors rowina-mono text-[10px] font-bold"
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
                    className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 transition-colors rowina-mono text-[10px] font-bold border border-emerald-500/30 px-4 py-2 rounded-full"
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
                          <h2 className="text-2xl sm:text-4xl font-bold rowina-title mb-2">{product.name}</h2>
                          <p className="rowina-mono text-[10px] sm:text-xs text-zinc-500">{product.category}</p>
                        </div>
                        {userRole === 'executive' && (
                          <div className="text-left sm:text-right">
                            <p className="rowina-mono text-[10px] text-zinc-500 mb-1 uppercase">Total Profit</p>
                            <p className="text-2xl sm:text-3xl font-bold text-emerald-500 break-all">{f(totalProfit)}</p>
                          </div>
                        )}
                      </div>

                      <div className={cn("grid gap-4", userRole === 'executive' ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
                        <div className="bg-rowina-gray p-4 sm:p-6 rounded-3xl border border-zinc-800">
                          <p className="rowina-mono text-[10px] text-zinc-500 mb-2 uppercase">Stock</p>
                          <p className="text-lg sm:text-xl font-bold text-white break-all">{product.stockQuantity} {product.unit}</p>
                        </div>
                        {userRole === 'executive' && (
                          <div className="bg-rowina-gray p-4 sm:p-6 rounded-3xl border border-zinc-800">
                            <p className="rowina-mono text-[10px] text-zinc-500 mb-2 uppercase">Buying Price</p>
                            <p className="text-lg sm:text-xl font-bold text-white break-all">{f(product.buyingPrice)}</p>
                          </div>
                        )}
                        <div className="bg-rowina-gray p-4 sm:p-6 rounded-3xl border border-zinc-800">
                          <p className="rowina-mono text-[10px] text-zinc-500 mb-2 uppercase">Selling Price</p>
                          <p className="text-lg sm:text-xl font-bold text-rowina-blue break-all">{f(product.sellingPrice)}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="rowina-mono text-xs font-bold text-zinc-500 uppercase tracking-widest">Sales History</h3>
                        {productSales.length > 0 ? (
                          <div className="space-y-2">
                            {productSales
                              .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
                              .map((sale) => {
                                const buyingPrice = sale.buyingPrice ?? product.buyingPrice;
                                const profit = round((sale.quantity * sale.sellingPrice) - sale.discount - (sale.quantity * buyingPrice));
                                return (
                                  <div key={sale.id} className="bg-rowina-gray/50 border border-zinc-800/50 p-4 rounded-2xl flex justify-between items-center">
                                    <div>
                                      <p className="text-sm font-bold text-white">QTY: {sale.quantity}</p>
                                      <p className="rowina-mono text-[9px] text-zinc-500">{format(parseISO(sale.date), 'MMM dd, yyyy')}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-bold text-rowina-blue">{f((sale.quantity * sale.sellingPrice) - sale.discount)}</p>
                                      {userRole === 'executive' && (
                                        <p className="rowina-mono text-[9px] text-emerald-500">PROFIT: {f(profit)}</p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="bg-rowina-gray/30 border border-dashed border-zinc-800 p-8 rounded-3xl text-center">
                            <p className="rowina-mono text-[10px] text-zinc-600">NO SALES RECORDED FOR THIS UNIT</p>
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
              <h2 className="text-2xl font-bold rowina-title">Financial Timeline</h2>
              <div className="flex items-center gap-4 bg-rowina-gray p-1 rounded-xl border border-zinc-800">
                <button 
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="rowina-mono text-[10px] font-bold px-2 min-w-[120px] text-center uppercase tracking-widest">
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

            <div className="bg-rowina-gray border border-zinc-800 rounded-3xl overflow-hidden">
              <div className="grid grid-cols-7 border-b border-zinc-800">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="py-3 text-center rowina-mono text-[8px] font-bold text-zinc-600 uppercase tracking-widest">
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
                          isSelected ? "bg-rowina-blue/10" : "hover:bg-white/5",
                          i % 7 === 6 && "border-r-0"
                        )}
                      >
                        <span className={cn(
                          "text-[10px] rowina-mono font-bold mb-1",
                          isTodayDate ? "text-rowina-blue" : isSelected ? "text-white" : "text-zinc-500"
                        )}>
                          {format(day, 'd')}
                        </span>
                        
                        <div className="mt-auto w-full space-y-1">
                          {stats.revenue > 0 && (
                            <div className="space-y-0.5">
                              <div className="h-1 w-full bg-rowina-blue/20 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-rowina-blue" 
                                  style={{ width: `${Math.min((stats.revenue / 1000) * 100, 100)}%` }}
                                />
                              </div>
                              <p className="text-[7px] rowina-mono text-rowina-blue font-bold">
                                {f(stats.revenue)}
                              </p>
                            </div>
                          )}
                          {stats.restockCost > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                              <p className="text-[6px] rowina-mono text-emerald-500 font-bold uppercase">Restocked</p>
                            </div>
                          )}
                        </div>
                        
                        {isSelected && (
                          <motion.div 
                            layoutId="calendar-select"
                            className="absolute inset-0 border-2 border-rowina-blue rounded-sm pointer-events-none"
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
                  <h3 className="rowina-mono text-xs font-bold text-rowina-blue tracking-widest uppercase">
                    LOGS FOR {format(selectedDate, 'MMMM dd, yyyy')}
                  </h3>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <p className="text-[8px] rowina-mono text-zinc-500 uppercase">Daily Revenue</p>
                      <p className="text-sm font-bold text-white">{f(getDayStats(selectedDate).revenue)}</p>
                    </div>
                    {userRole === 'executive' && (
                      <div className="text-right">
                        <p className="text-[8px] rowina-mono text-zinc-500 uppercase">Net Profit</p>
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
                  <div className="bg-rowina-gray border border-zinc-800 p-6 rounded-3xl space-y-4">
                    <h4 className="rowina-mono text-[10px] font-bold text-zinc-500 uppercase tracking-widest">TRANSACTIONS</h4>
                    {sales.filter(s => s.date === format(selectedDate, 'yyyy-MM-dd')).length > 0 ? (
                      <div className="space-y-3">
                        {sales.filter(s => s.date === format(selectedDate, 'yyyy-MM-dd')).map(sale => {
                          const product = products.find(p => p.id === sale.productId);
                          return (
                            <div key={sale.id} className="flex justify-between items-center py-2 border-b border-zinc-800/50 last:border-0">
                              <div>
                                <p className="text-xs font-bold text-white">{product?.name || 'Unknown'}</p>
                                <p className="text-[8px] rowina-mono text-zinc-600">QTY: {sale.quantity} • {sale.paymentMethod?.toUpperCase()} • {f(sale.sellingPrice)}/ea</p>
                              </div>
                              <p className="text-xs font-bold text-rowina-blue">{f(sale.quantity * sale.sellingPrice - sale.discount)}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] rowina-mono text-zinc-700 text-center py-4 italic">NO SALES RECORDED</p>
                    )}
                  </div>

                  <div className="bg-rowina-gray border border-zinc-800 p-6 rounded-3xl space-y-4">
                    <h4 className="rowina-mono text-[10px] font-bold text-zinc-500 uppercase tracking-widest">EXPENDITURES</h4>
                    {expenses.filter(e => e.date === format(selectedDate, 'yyyy-MM-dd')).length > 0 ? (
                      <div className="space-y-3">
                        {expenses.filter(e => e.date === format(selectedDate, 'yyyy-MM-dd')).map(expense => (
                          <div key={expense.id} className="flex justify-between items-center py-2 border-b border-zinc-800/50 last:border-0">
                            <div>
                              <p className="text-xs font-bold text-white">{expense.description}</p>
                              <p className="text-[8px] rowina-mono text-zinc-600 uppercase">{expense.category}</p>
                            </div>
                            <p className="text-xs font-bold text-zinc-400">{f(expense.amount)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] rowina-mono text-zinc-700 text-center py-4 italic">NO EXPENSES RECORDED</p>
                    )}
                  </div>

                  <div className="bg-rowina-gray border border-zinc-800 p-6 rounded-3xl space-y-4 md:col-span-2">
                    <h4 className="rowina-mono text-[10px] font-bold text-emerald-500 uppercase tracking-widest">INVENTORY RESTOCKS</h4>
                    {restocks.filter(r => r.date === format(selectedDate, 'yyyy-MM-dd')).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {restocks.filter(r => r.date === format(selectedDate, 'yyyy-MM-dd')).map(restock => {
                          const product = products.find(p => p.id === restock.productId);
                          return (
                            <div key={restock.id} className="flex justify-between items-center py-3 px-4 bg-rowina-black/40 rounded-2xl border border-zinc-800/50">
                              <div>
                                <p className="text-xs font-bold text-white">{product?.name || 'Unknown'}</p>
                                <p className="text-[8px] rowina-mono text-emerald-500 uppercase">ADDED {restock.quantity} {product?.unit || 'units'}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold text-zinc-400">{f(restock.quantity * restock.unitCost)}</p>
                                <p className="text-[8px] rowina-mono text-zinc-600 uppercase">COST: {f(restock.unitCost)}/ea</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] rowina-mono text-zinc-700 text-center py-4 italic">NO RESTOCKS RECORDED</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === 'documents' && (
          <motion.div
            key="documents"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold rowina-title">Business Documents</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => requireAuth(() => {
                    setQuotationForm({
                      clientName: '',
                      date: format(new Date(), 'yyyy-MM-dd'),
                      items: [],
                      status: 'Draft',
                      totalAmount: 0
                    });
                    setIsQuotationModalOpen(true);
                  })}
                  className="bg-zinc-800 text-white px-4 py-2 rounded-full font-bold rowina-mono text-[9px] tracking-widest hover:bg-rowina-blue hover:text-black transition-all"
                >
                  NEW QUOTE
                </button>
                <button 
                  onClick={() => requireAuth(() => {
                    setInvoiceForm({
                      clientName: '',
                      date: format(new Date(), 'yyyy-MM-dd'),
                      items: [],
                      status: 'Pending',
                      totalAmount: 0,
                      paidAmount: 0
                    });
                    setIsInvoiceModalOpen(true);
                  })}
                  className="bg-zinc-800 text-white px-4 py-2 rounded-full font-bold rowina-mono text-[9px] tracking-widest hover:bg-emerald-500 hover:text-black transition-all"
                >
                  NEW INVOICE
                </button>
              </div>
            </div>

            <div className="flex gap-4 border-b border-zinc-800 pb-2">
               {['RECEIPTS', 'INVOICES', 'QUOTATIONS'].map(sub => (
                 <button
                   key={sub}
                   onClick={() => setDocumentSubTab(sub as any)}
                   className={cn(
                     "pb-2 rowina-mono text-[10px] font-bold tracking-widest transition-all px-2",
                     documentSubTab === sub ? "text-rowina-blue border-b-2 border-rowina-blue" : "text-zinc-500 hover:text-zinc-300"
                   )}
                 >
                   {sub}
                 </button>
               ))}
            </div>

            {documentSubTab === 'RECEIPTS' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input 
                    type="text" 
                    placeholder="SEARCH RECEIPTS..." 
                    value={receiptsSearch}
                    onChange={e => setReceiptsSearch(e.target.value)}
                    className="w-full bg-rowina-gray border border-zinc-800 rounded-2xl pl-12 pr-6 py-3 text-xs rowina-mono outline-none"
                  />
                </div>
                <div className="grid gap-4">
                  {sales
                    .filter(sale => {
                      const product = products.find(p => p.id === sale.productId);
                      return product?.name.toLowerCase().includes(receiptsSearch.toLowerCase()) || sale.paymentMethod.toLowerCase().includes(receiptsSearch.toLowerCase());
                    })
                    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
                    .map(sale => {
                      const product = products.find(p => p.id === sale.productId);
                      return (
                        <div key={sale.id} className="bg-rowina-gray border border-zinc-800 p-6 rounded-3xl flex justify-between items-center group">
                          <div>
                            <p className="rowina-mono text-[8px] text-zinc-500 uppercase mb-1">{format(parseISO(sale.date), 'MMMM dd, yyyy')}</p>
                            <h4 className="font-bold text-white text-lg">{product?.name || 'Unknown Item'}</h4>
                            <p className="rowina-mono text-[10px] text-zinc-500 uppercase">METHOD: {sale.paymentMethod} • QTY: {sale.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-rowina-blue">{f(sale.quantity * sale.sellingPrice - sale.discount)}</p>
                            <button className="rowina-mono text-[8px] font-bold text-zinc-600 mt-2 hover:text-rowina-blue flex items-center gap-1 ml-auto">
                              <Printer size={10} /> PRINT RECEIPT
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  {sales.length === 0 && <p className="text-center py-12 text-zinc-600 rowina-mono text-xs italic">NO RECEIPTS FOUND</p>}
                </div>
              </div>
            )}

            {documentSubTab === 'INVOICES' && (
              <div className="space-y-4">
                <div className="grid gap-4">
                  {invoices
                    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
                    .map(inv => (
                      <div key={inv.id} className="bg-rowina-gray border border-zinc-800 p-6 rounded-3xl flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                             <p className="rowina-mono text-[8px] text-zinc-500 uppercase">{format(parseISO(inv.date), 'MMM dd, yyyy')}</p>
                             <span className={cn(
                               "text-[7px] font-bold px-1.5 py-0.5 rounded rowina-mono uppercase",
                               inv.status === 'Paid' ? "bg-emerald-500/20 text-emerald-500" : 
                               inv.status === 'Overdue' ? "bg-rose-500/20 text-rose-500" : "bg-rowina-blue/20 text-rowina-blue"
                             )}>
                               {inv.status}
                             </span>
                          </div>
                          <h4 className="font-bold text-white text-lg">{inv.clientName}</h4>
                          <p className="rowina-mono text-[10px] text-zinc-500 uppercase">{inv.items.length} ITEMS • BAL: {f(inv.totalAmount - inv.paidAmount)}</p>
                        </div>
                          <div className="text-right">
                          <p className="text-xl font-bold text-white">{f(inv.totalAmount)}</p>
                          <div className="flex gap-2 mt-2 justify-end">
                            <button className="p-1 px-2 bg-zinc-800 rounded hover:bg-rowina-blue transition-all"><Printer size={12} /></button>
                            {inv.status !== 'Paid' && (
                              <button 
                                onClick={() => handlePayInvoice(inv)}
                                className="p-1 px-2 bg-zinc-800 rounded hover:bg-emerald-500 transition-all text-[8px] rowina-mono font-bold"
                              >
                                PAY
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  {invoices.length === 0 && <p className="text-center py-12 text-zinc-600 rowina-mono text-xs italic">NO INVOICES FOUND</p>}
                </div>
              </div>
            )}

            {documentSubTab === 'QUOTATIONS' && (
              <div className="space-y-4">
                <div className="grid gap-4">
                  {quotations
                    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
                    .map(q => (
                      <div key={q.id} className="bg-rowina-gray border border-zinc-800 p-6 rounded-3xl flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                             <p className="rowina-mono text-[8px] text-zinc-500 uppercase">{format(parseISO(q.date), 'MMM dd, yyyy')}</p>
                             <span className="text-[7px] font-bold px-1.5 py-0.5 rounded rowina-mono uppercase bg-zinc-800 text-zinc-400">
                               {q.status}
                             </span>
                          </div>
                          <h4 className="font-bold text-white text-lg">{q.clientName}</h4>
                          <p className="rowina-mono text-[10px] text-zinc-500 uppercase">{q.items.length} ITEMS • EXPIRES: {q.expiryDate || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-white">{f(q.totalAmount)}</p>
                          <div className="flex gap-2 mt-2 justify-end">
                            <button className="p-1 px-2 bg-zinc-800 rounded hover:bg-rowina-blue transition-all"><Printer size={12} /></button>
                            {q.status !== 'Accepted' && (
                              <button 
                                onClick={() => handleConvertQuotationToInvoice(q)}
                                className="p-1 px-2 bg-zinc-800 rounded hover:bg-emerald-500 transition-all text-[8px] rowina-mono font-bold"
                              >
                                CONVERT
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  {quotations.length === 0 && <p className="text-center py-12 text-zinc-600 rowina-mono text-xs italic">NO QUOTATIONS FOUND</p>}
                </div>
              </div>
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
              <h2 className="text-2xl font-bold rowina-title">Client Ledger</h2>
              <button 
                onClick={() => requireAuth(() => {
                  setEditingClient(null);
                  setClientForm({ name: '', phone: '', totalDebt: undefined });
                  setIsClientModalOpen(true);
                })}
                className="w-10 h-10 rounded-full rowina-pill-active flex items-center justify-center"
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
                className="w-full bg-rowina-gray border border-zinc-800 rounded-3xl pl-12 pr-6 py-4 text-sm focus:border-rowina-blue outline-none transition-all"
              />
            </div>

            <div className="space-y-4">
              {clients
                .filter(c => c.name.toLowerCase().includes(clientsSearch.toLowerCase()) || c.phone.includes(clientsSearch))
                .map(client => (
                  <div key={client.id} className="bg-rowina-gray border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-all">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                          <Users size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">{client.name}</h3>
                          <p className="rowina-mono text-[9px] text-zinc-500 uppercase">{client.phone}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="rowina-mono text-[8px] text-zinc-500 uppercase mb-1">Outstanding Debt</p>
                        <p className={cn("text-xl font-bold", client.totalDebt > 0 ? "text-rose-500" : "text-emerald-500")}>
                          {f(client.totalDebt)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mb-6">
                      <button 
                        onClick={() => requireAuth(() => { setSelectedClient(client); setIsClientTransactionModalOpen(true); })}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl text-[10px] font-bold rowina-mono tracking-widest transition-all flex items-center justify-center gap-2"
                      >
                        <CreditCard size={14} /> ADJUST BALANCE
                      </button>
                      <button 
                        onClick={() => requireAuth(() => {
                          setEditingClient(client);
                          setClientForm({ name: client.name, phone: client.phone, totalDebt: client.totalDebt });
                          setIsClientModalOpen(true);
                        })}
                        className="w-12 bg-zinc-800 hover:bg-rowina-blue/20 hover:text-rowina-blue text-zinc-500 rounded-xl flex items-center justify-center transition-all"
                        title="Edit Client"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => requireAuth(() => handleDeleteClient(client.id))}
                        className="w-12 bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-500 text-zinc-500 rounded-xl flex items-center justify-center transition-all"
                        title="Delete Client"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                      <div className="pt-4 border-t border-zinc-800/50">
                        <p className="rowina-mono text-[8px] text-zinc-600 uppercase mb-3 tracking-widest">Client Ledger (Recent)</p>
                        <div className="space-y-2">
                          {clientTransactions
                            .filter(t => t.clientId === client.id)
                            .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
                            .slice(0, 3)
                            .map(t => (
                            <div key={t.id} className="flex justify-between items-center text-[10px] rowina-mono">
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
                          <p className="text-[9px] rowina-mono text-zinc-700 italic">No ledger activity recorded</p>
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
              <h2 className="text-2xl font-bold rowina-title">Intelligence Reports</h2>
              <button 
                onClick={() => requireAuth(exportToPDF)}
                className="flex items-center gap-2 bg-rowina-blue text-black px-6 py-3 rounded-full font-bold rowina-mono text-[10px] tracking-widest hover:scale-105 transition-transform"
              >
                <Download size={16} /> EXPORT PDF
              </button>
            </div>

            <div className="bg-rowina-gray border border-zinc-800 p-6 rounded-3xl space-y-4">
              <label className="rowina-mono text-[10px] text-zinc-500 uppercase tracking-widest">Select Report Date</label>
              <input 
                type="date" 
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none rowina-mono"
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-rowina-gray p-5 sm:p-6 rounded-[32px] border border-zinc-800 relative min-h-[110px] flex flex-col justify-between">
                      <p className="rowina-mono text-[10px] text-zinc-500 uppercase tracking-widest">Daily Revenue</p>
                      <div className="mt-2">
                        <p className="text-3xl sm:text-4xl font-bold tracking-tight text-white">{f(revenue)}</p>
                      </div>
                    </div>
                    {userRole === 'executive' && (
                      <div className="bg-rowina-gray p-5 sm:p-6 rounded-[32px] border border-zinc-800 relative min-h-[110px] flex flex-col justify-between">
                        <p className="rowina-mono text-[10px] text-zinc-500 uppercase tracking-widest">Daily Profit</p>
                        <div className="mt-2">
                          <p className={cn("text-3xl sm:text-4xl font-bold tracking-tight", netProfit >= 0 ? "text-emerald-500" : "text-rose-500")}>
                            {f(netProfit)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="rowina-mono text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Sales Log ({daySales.length})</h3>
                    {daySales.length > 0 ? (
                      <div className="space-y-2">
                        {daySales.map(s => {
                          const product = products.find(p => p.id === s.productId);
                          return (
                            <div key={s.id} className="bg-rowina-gray/50 border border-zinc-800/50 p-4 rounded-2xl flex justify-between items-center">
                              <div>
                                <p className="text-sm font-bold text-white">{product?.name || 'Unknown'}</p>
                                <p className="rowina-mono text-[9px] text-zinc-500">QTY: {s.quantity} • {s.paymentMethod}</p>
                              </div>
                              <p className="text-sm font-bold text-rowina-blue">{f(s.quantity * s.sellingPrice - s.discount)}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center py-8 text-[10px] rowina-mono text-zinc-700 italic border border-dashed border-zinc-800 rounded-3xl">NO SALES RECORDED FOR THIS DATE</p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="rowina-mono text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Expense Log ({dayExpenses.length})</h3>
                    {dayExpenses.length > 0 ? (
                      <div className="space-y-2">
                        {dayExpenses.map(e => (
                          <div key={e.id} className="bg-rowina-gray/50 border border-zinc-800/50 p-4 rounded-2xl flex justify-between items-center">
                            <div>
                              <p className="text-sm font-bold text-white">{e.description}</p>
                              <p className="rowina-mono text-[9px] text-zinc-500">{e.category}</p>
                            </div>
                            <p className="text-sm font-bold text-rose-500">{f(e.amount)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-8 text-[10px] rowina-mono text-zinc-700 italic border border-dashed border-zinc-800 rounded-3xl">NO EXPENSES RECORDED FOR THIS DATE</p>
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
            <div className="flex justify-between items-center bg-rowina-gray p-6 rounded-[32px] border border-zinc-800">
               <div>
                <h2 className="text-2xl font-bold rowina-title leading-tight">Surveillance Center</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className={cn("w-1.5 h-1.5 rounded-full", userProfile?.notificationsEnabled !== false ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                  <p className="rowina-mono text-[8px] text-zinc-500 uppercase tracking-[0.2em]">
                    System {userProfile?.notificationsEnabled !== false ? 'Live' : 'Paused'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end gap-1.5 mr-2">
                   <p className="rowina-mono text-[8px] text-zinc-600 uppercase tracking-widest font-bold">Alert Feed</p>
                   <button 
                    onClick={async () => {
                      if (!userProfile) return;
                      const next = userProfile.notificationsEnabled === false;
                      try {
                        await updateDoc(doc(db, 'users', userProfile.id), { notificationsEnabled: next });
                        setUserProfile({ ...userProfile, notificationsEnabled: next });
                      } catch (err) {
                        handleFirestoreError(err, OperationType.UPDATE, 'users');
                      }
                    }}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-all duration-500",
                      userProfile?.notificationsEnabled !== false ? "bg-emerald-500/20 text-emerald-500" : "bg-zinc-800 text-zinc-600"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full transition-all duration-300",
                      userProfile?.notificationsEnabled !== false ? "right-1 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "left-1 bg-zinc-600"
                    )} />
                  </button>
                </div>

                <div className="h-10 w-[1px] bg-zinc-800 mx-1" />

                <button 
                  onClick={() => setIsAlertModalOpen(true)}
                  className="w-12 h-12 rounded-2xl rowina-pill-active flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>

            {/* Triggered Alerts Section */}
            {triggeredAlerts.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="rowina-mono text-[10px] font-bold text-rowina-blue tracking-widest">ACTIVE INCIDENTS</h3>
                  <div className="flex gap-4">
                    <button 
                      onClick={handleMarkAllAlertsRead}
                      className="text-[8px] rowina-mono text-zinc-500 hover:text-white transition-colors"
                    >
                      MARK ALL AS READ
                    </button>
                    <button 
                      onClick={handleClearAllAlerts}
                      className="text-[8px] rowina-mono text-rose-500 hover:text-rose-400 transition-colors"
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
                        alert.isRead ? "bg-rowina-gray/30 border-zinc-800/50 opacity-60" : "bg-rose-500/10 border-rose-500/30"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg mt-1", alert.isRead ? "bg-zinc-800 text-zinc-500" : "bg-rose-500 text-white")}>
                        <AlertTriangle size={14} />
                      </div>
                      <div className="flex-1">
                        <p className={cn("text-xs font-bold", alert.isRead ? "text-zinc-400" : "text-white")}>{alert.message}</p>
                        <p className="rowina-mono text-[8px] text-zinc-600 mt-1">{format(parseISO(alert.timestamp), 'HH:mm:ss • MMM dd')}</p>
                      </div>
                      {!alert.isRead && (
                        <button 
                          onClick={async () => {
                            try {
                              await updateDoc(doc(db, 'triggeredAlerts', alert.id), { isRead: true });
                            } catch (err) {
                              handleFirestoreError(err, OperationType.UPDATE, 'triggeredAlerts');
                            }
                          }}
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
              <div className="flex justify-between items-center">
                <h3 className="rowina-mono text-[10px] font-bold text-zinc-500 tracking-widest">WATCHLIST RULES</h3>
                <div className="relative w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={12} />
                  <input 
                    type="text" 
                    placeholder="FILTER RULES..." 
                    value={alertsSearch}
                    onChange={e => setAlertsSearch(e.target.value)}
                    className="w-full bg-rowina-gray border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-[10px] rowina-mono focus:border-rowina-blue outline-none transition-all"
                  />
                </div>
              </div>
              {alerts.filter(a => a.name.toLowerCase().includes(alertsSearch.toLowerCase())).length === 0 ? (
                <div className="bg-rowina-gray/30 border border-dashed border-zinc-800 p-12 rounded-[2rem] text-center">
                  <Activity className="mx-auto text-zinc-800 mb-4" size={32} />
                  <p className="rowina-mono text-[10px] text-zinc-600">{alertsSearch ? 'NO MATCHING RULES FOUND' : 'NO ACTIVE SURVEILLANCE RULES'}</p>
                  <button onClick={() => setIsAlertModalOpen(true)} className="mt-4 text-[10px] rowina-mono text-rowina-blue hover:underline">INITIALIZE RULE</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts
                    .filter(a => a.name.toLowerCase().includes(alertsSearch.toLowerCase()))
                    .map((rule) => (
                      <div key={rule.id} className="bg-rowina-gray border border-zinc-800 p-5 rounded-3xl flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-xl", rule.isActive ? "bg-rowina-blue/10 text-rowina-blue" : "bg-zinc-800 text-zinc-600")}>
                          <Shield size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{rule.name}</h4>
                          <p className="rowina-mono text-[9px] text-zinc-500">
                            {rule.type.replace('_', ' ')} • THRESHOLD: {rule.type === 'SALES_TARGET' ? f(rule.threshold) : rule.threshold}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => handleToggleAlert(rule)}
                          className={cn(
                            "w-10 h-5 rounded-full relative transition-all",
                            rule.isActive ? "bg-rowina-blue" : "bg-zinc-800"
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
              <h2 className="text-2xl font-bold rowina-title">Security Settings</h2>
              <p className="rowina-mono text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Configure App Lock & Access</p>
            </div>

            <div className="bg-rowina-gray border border-zinc-800 p-8 rounded-[40px] space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-rowina-blue">
                  <Fingerprint size={32} />
                  <div>
                    <h3 className="text-white font-bold text-lg">Two-Factor Authentication (2FA)</h3>
                    <p className="text-zinc-500 text-xs max-w-md">Add an extra layer of security using Google Authenticator or any TOTP compatible app.</p>
                  </div>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[8px] rowina-mono font-bold uppercase tracking-widest",
                  userProfile?.otpEnabled ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-800 text-zinc-500"
                )}>
                  {userProfile?.otpEnabled ? "Protected" : "Vulnerable"}
                </div>
              </div>

              <div className="space-y-6">
                {userProfile?.otpEnabled ? (
                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-3xl space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                        <CheckCircle size={24} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-white text-sm font-bold">Authentication Protocol Active</p>
                        <p className="text-zinc-500 text-xs">Your account is secured with biometric-grade TOTP verification. Every login now mandates a unique verification vector.</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleDisableOtp}
                      className="w-full py-4 rounded-xl font-bold rowina-mono text-[9px] tracking-[0.2em] text-rose-500 hover:bg-rose-500/10 transition-all border border-rose-500/10 uppercase"
                    >
                      Deactivate 2FA Protocol
                    </button>
                  </div>
                ) : otpSetupStep === 'QR' ? (
                  <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[32px] space-y-8 text-center animate-in fade-in zoom-in-95">
                    <div className="space-y-2">
                       <h4 className="text-white font-bold rowina-mono text-xs uppercase tracking-widest">Scan Secure Vector</h4>
                       <p className="text-zinc-500 text-[10px] leading-relaxed">Use Google Authenticator to scan this QR code. It contains your unique encrypted secret key.</p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-3xl inline-block mx-auto shadow-2xl">
                      <img src={otpQrCode} alt="OTP QR Code" className="w-48 h-48" />
                    </div>

                    <div className="space-y-2">
                      <p className="text-zinc-600 text-[8px] rowina-mono uppercase tracking-widest">Manual Setup Key:</p>
                      <code className="text-rowina-blue text-xs font-mono break-all bg-black/40 p-2 rounded-lg block border border-zinc-800">
                        {typeof otpSecretRaw === 'string' && otpSecretRaw.includes(':') ? otpSecretRaw.split(':')[1]?.substring(0, 32) : 'GENERATING...'}...
                      </code>
                    </div>

                    <button 
                      onClick={() => setOtpSetupStep('VERIFY')}
                      className="w-full py-4 rounded-2xl font-bold rowina-mono text-xs tracking-widest uppercase rowina-pill-active shadow-lg shadow-rowina-blue/20"
                    >
                      Vector Scanned Successfully →
                    </button>
                  </div>
                ) : otpSetupStep === 'VERIFY' ? (
                  <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[32px] space-y-8 text-center animate-in slide-in-from-right-4">
                    <div className="space-y-2">
                       <h4 className="text-white font-bold rowina-mono text-xs uppercase tracking-widest">Validation Test</h4>
                       <p className="text-zinc-500 text-[10px] leading-relaxed">Enter the 6-digit code currently displayed in your Authenticator app to confirm link.</p>
                    </div>

                    <input 
                      type="text" 
                      maxLength={6}
                      placeholder="000000"
                      value={otpToken}
                      onChange={e => setOtpToken(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-5 text-3xl text-center tracking-[0.4em] font-bold text-rowina-blue focus:border-rowina-blue outline-none transition-all placeholder:text-zinc-900 shadow-inner"
                    />

                    {otpVerifyError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl">
                        <p className="text-rose-500 text-[8px] rowina-mono font-bold uppercase tracking-widest">{otpVerifyError}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setOtpSetupStep('QR')}
                        className="py-4 rounded-2xl font-bold rowina-mono text-[9px] tracking-widest uppercase text-zinc-500 border border-zinc-800"
                      >
                        ← Back to QR
                      </button>
                      <button 
                        onClick={handleConfirmOtpSetup}
                        disabled={isLoggingIn || otpToken.length !== 6}
                        className="py-4 rounded-2xl font-bold rowina-mono text-[9px] tracking-widest uppercase rowina-pill-active disabled:opacity-30"
                      >
                        {isLoggingIn ? 'Validating...' : 'Verify & Activate'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={handleSetupOtp}
                    disabled={isLoggingIn}
                    className="w-full flex items-center justify-center gap-4 bg-zinc-900 border border-zinc-800 py-6 rounded-3xl hover:border-rowina-blue transition-all group shadow-inner"
                  >
                    <div className="w-12 h-12 bg-rowina-blue/10 rounded-2xl flex items-center justify-center text-rowina-blue group-hover:scale-110 transition-transform">
                      <Shield size={24} />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-bold text-sm">Initiate 2FA Protocol</p>
                      <p className="text-zinc-600 text-[10px] rowina-mono uppercase tracking-widest">Upgrade account defensive matrix</p>
                    </div>
                    <div className="ml-auto mr-4 text-zinc-700">
                      <ChevronRight size={20} />
                    </div>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-rowina-gray border border-zinc-800 p-8 rounded-[40px] space-y-8">
              <div className="flex items-center gap-4 text-rowina-blue">
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
                      "py-4 rounded-2xl font-bold rowina-mono text-[10px] tracking-widest transition-all border",
                      appLockConfig.type === 'pin' ? "bg-rowina-blue text-black border-rowina-blue" : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600"
                    )}
                  >
                    PIN LOCK
                  </button>
                  <button 
                    onClick={() => setAppLockConfig({ ...appLockConfig, type: 'password' })}
                    className={cn(
                      "py-4 rounded-2xl font-bold rowina-mono text-[10px] tracking-widest transition-all border",
                      appLockConfig.type === 'password' ? "bg-rowina-blue text-black border-rowina-blue" : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600"
                    )}
                  >
                    PASSWORD LOCK
                  </button>
                </div>

                {appLockConfig.type && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2 uppercase">
                        SET NEW {appLockConfig.type === 'pin' ? '4-DIGIT PIN' : 'PASSWORD'}
                      </label>
                      <input 
                        type={appLockConfig.type === 'pin' ? 'number' : 'password'}
                        placeholder={appLockConfig.type === 'pin' ? '0000' : '••••••••'}
                        value={appLockConfig.value || ''}
                        onChange={e => setAppLockConfig({ ...appLockConfig, value: e.target.value })}
                        className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none transition-all"
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
                  className="w-full py-4 rounded-2xl font-bold rowina-mono text-[10px] tracking-widest text-rose-500 border border-rose-500/20 hover:bg-rose-500/10 transition-all"
                >
                  DISABLE APP LOCK
                </button>
              </div>
            </div>

            {userRole === 'executive' && (
              <div className="bg-rowina-gray border border-zinc-800 p-8 rounded-[40px] space-y-8">
                <div className="flex items-center gap-4 text-rowina-blue">
                  <Key size={32} />
                  <div>
                    <h3 className="text-white font-bold">Executive Access Password</h3>
                    <p className="text-zinc-500 text-xs">This password is required for employees to switch to executive mode.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] rowina-mono text-zinc-500 ml-2 uppercase">
                      SET NEW EXECUTIVE PASSWORD
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="password"
                        placeholder="••••••••"
                        value={newExecPassword}
                        onChange={e => setNewExecPassword(e.target.value)}
                        className="flex-1 bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none transition-all"
                      />
                      <button 
                        onClick={async () => {
                          if (!newExecPassword || newExecPassword.length < 4) {
                            setConfirmModal({
                              isOpen: true,
                              title: 'INVALID PASSWORD',
                              message: 'Password must be at least 4 characters.',
                              onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                            });
                            return;
                          }
                          setIsUpdatingExecPassword(true);
                          try {
                            await setDoc(doc(db, 'settings', 'global'), { executivePassword: newExecPassword });
                            setNewExecPassword('');
                            setConfirmModal({
                              isOpen: true,
                              title: 'SUCCESS',
                              message: 'Executive password updated successfully.',
                              onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
                            });
                          } catch (err) {
                            handleFirestoreError(err, OperationType.WRITE, 'settings/global');
                          } finally {
                            setIsUpdatingExecPassword(false);
                          }
                        }}
                        disabled={isUpdatingExecPassword}
                        className="px-8 bg-rowina-blue text-black rounded-2xl font-bold rowina-mono text-[10px] tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {isUpdatingExecPassword ? 'UPDATING...' : 'UPDATE'}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 italic px-2">
                    * Current password is required for any employee to gain executive privileges. Keep it safe.
                  </p>
                </div>
              </div>
            )}
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
              <h2 className="text-2xl font-bold rowina-title">Staff Command</h2>
              <button 
                onClick={() => {
                  setEditingStaff(null);
                  setStaffForm({ email: '', role: 'employee', displayName: '', assignedStoreIds: [], tempPassword: '' });
                  setIsStaffModalOpen(true);
                }}
                className="w-10 h-10 rounded-full rowina-pill-active flex items-center justify-center"
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
                className="w-full bg-rowina-gray border border-zinc-800 rounded-3xl pl-12 pr-6 py-4 text-sm focus:border-rowina-blue outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {staff
                .filter(s => s.email.toLowerCase().includes(staffSearch.toLowerCase()) || (s.displayName || '').toLowerCase().includes(staffSearch.toLowerCase()))
                .map(member => (
                  <div key={member.id} className="bg-rowina-gray border border-zinc-800 p-6 rounded-3xl flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                        <Users size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{member.displayName || 'Unnamed Staff'}</h4>
                        <p className="rowina-mono text-[9px] text-zinc-500 uppercase">{member.email}</p>
                        {member.tempPassword && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="rowina-mono text-[8px] text-zinc-500 uppercase tracking-tighter">PWD:</span>
                            <span className="rowina-mono text-[8px] text-rowina-blue/70 uppercase"> {member.tempPassword}</span>
                          </div>
                        )}
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
                              "px-2 py-0.5 rounded text-[8px] font-bold rowina-mono uppercase transition-all hover:scale-105",
                              member.role === 'executive' ? "bg-rowina-blue/10 text-rowina-blue" : "bg-zinc-800 text-zinc-500"
                            )}
                          >
                            {member.role === 'executive' ? 'EXEC' : 'STAFF'}
                          </button>
                          {member.assignedStoreIds?.map(storeId => {
                            const store = stores.find(s => s.id === storeId);
                            return store ? (
                              <span key={storeId} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[8px] font-bold rowina-mono uppercase">
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
                            assignedStoreIds: member.assignedStoreIds || [],
                            tempPassword: member.tempPassword || ''
                          });
                          setIsStaffModalOpen(true);
                        }}
                        className="p-2 text-zinc-500 hover:text-rowina-blue transition-colors"
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
              <h2 className="text-2xl font-bold rowina-title">Store Command</h2>
              <button 
                onClick={() => {
                  setEditingStore(null);
                  setStoreForm({ name: '', location: '' });
                  setIsStoreModalOpen(true);
                }}
                className="w-10 h-10 rounded-full rowina-pill-active flex items-center justify-center"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stores.length === 0 ? (
                <div className="col-span-full bg-rowina-gray border border-zinc-800 p-12 rounded-[40px] text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 mx-auto">
                    <Package size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">No Stores Found</h3>
                    <p className="rowina-mono text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Initialize your first store to begin</p>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingStore(null);
                      setStoreForm({ name: '', location: '' });
                      setIsStoreModalOpen(true);
                    }}
                    className="rowina-pill-active px-6 py-2 rounded-full text-[10px] rowina-mono font-bold"
                  >
                    INITIALIZE STORE
                  </button>
                </div>
              ) : (
                stores.map(store => (
                  <div key={store.id} className="bg-rowina-gray border border-zinc-800 p-6 rounded-3xl flex justify-between items-center group hover:border-rowina-blue/50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-rowina-blue/10 group-hover:text-rowina-blue transition-all">
                        <Package size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{store.name}</h4>
                        <p className="rowina-mono text-[9px] text-zinc-500 uppercase">{store.location || 'NO LOCATION SET'}</p>
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
                          isSubmitting ? "text-zinc-800 cursor-not-allowed" : "text-zinc-500 hover:text-rowina-blue"
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
                ))
              )}
            </div>
          </motion.div>
        )}
        {activeTab === 'help' && (
          <motion.div
            key="help"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-bold rowina-title">User Intelligence Guide</h2>
              <p className="rowina-mono text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Operational Manual & Tutorials</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="bg-rowina-gray border border-zinc-800 p-8 rounded-[40px] space-y-6">
                <div className="flex items-center gap-4 text-rowina-blue">
                  <TrendingUp size={32} />
                  <h3 className="text-xl font-bold text-white uppercase tracking-tight">Portfolio & Analytics</h3>
                </div>
                <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
                  <p>
                    The <span className="text-white font-bold">Portfolio</span> tab provides a high-level overview of your business performance. 
                    Track revenue, expenses, and net profit in real-time.
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li><span className="text-zinc-200">Time Periods:</span> Switch between Daily, Weekly, Monthly, and Yearly views.</li>
                    <li><span className="text-zinc-200">Trends:</span> Monitor percentage changes compared to previous periods.</li>
                    <li><span className="text-zinc-200">Visualizations:</span> Analyze sales vs. expenses charts to identify patterns.</li>
                  </ul>
                </div>
              </div>

              <div className="bg-rowina-gray border border-zinc-800 p-8 rounded-[40px] space-y-6">
                <div className="flex items-center gap-4 text-emerald-500">
                  <ShoppingCart size={32} />
                  <h3 className="text-xl font-bold text-white uppercase tracking-tight">Store Management</h3>
                </div>
                <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
                  <p>
                    Manage your inventory and record sales in the <span className="text-white font-bold">Store</span> tab.
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li><span className="text-zinc-200">Inventory:</span> Add products with buying/selling prices and stock levels.</li>
                    <li><span className="text-zinc-200">Record Sales:</span> Quickly log sales. Stock levels update automatically.</li>
                    <li><span className="text-zinc-200">Restocking:</span> Log restock entries to maintain accurate inventory counts.</li>
                  </ul>
                </div>
              </div>

              <div className="bg-rowina-gray border border-zinc-800 p-8 rounded-[40px] space-y-6">
                <div className="flex items-center gap-4 text-amber-500">
                  <Users size={32} />
                  <h3 className="text-xl font-bold text-white uppercase tracking-tight">Client Ledger</h3>
                </div>
                <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
                  <p>
                    Track client debts and payments in the <span className="text-white font-bold">Clients</span> tab.
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li><span className="text-zinc-200">Debt Tracking:</span> Record credits (debts) and payments for each client.</li>
                    <li><span className="text-zinc-200">History:</span> View a detailed ledger of all transactions per client.</li>
                    <li><span className="text-zinc-200">Search:</span> Quickly find clients by name or phone number.</li>
                  </ul>
                </div>
              </div>

              <div className="bg-rowina-gray border border-zinc-800 p-8 rounded-[40px] space-y-6">
                <div className="flex items-center gap-4 text-rose-500">
                  <Bell size={32} />
                  <h3 className="text-xl font-bold text-white uppercase tracking-tight">Alert Command</h3>
                </div>
                <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
                  <p>
                    Set up automated surveillance rules in the <span className="text-white font-bold">Alerts</span> tab (Executive only).
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li><span className="text-zinc-200">Low Stock:</span> Get notified when a product falls below a certain quantity.</li>
                    <li><span className="text-zinc-200">Sales Targets:</span> Celebrate when you reach specific revenue milestones.</li>
                    <li><span className="text-zinc-200">Profit Margins:</span> Monitor if your margins drop below your goals.</li>
                  </ul>
                </div>
              </div>

              <div className="bg-rowina-gray border border-zinc-800 p-8 rounded-[40px] space-y-6">
                <div className="flex items-center gap-4 text-indigo-500">
                  <Shield size={32} />
                  <h3 className="text-xl font-bold text-white uppercase tracking-tight">Security & Access</h3>
                </div>
                <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
                  <p>
                    Protect your data and manage your team.
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li><span className="text-zinc-200">App Lock:</span> Set a local PIN or password in the <span className="text-white font-bold">Security</span> tab.</li>
                    <li><span className="text-zinc-200">Staff Roles:</span> Assign 'Employee' or 'Executive' roles to control access.</li>
                    <li><span className="text-zinc-200">Multi-Store:</span> Executives can manage multiple store locations independently.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-rowina-blue/10 border border-rowina-blue/20 p-8 rounded-[40px] text-center space-y-4">
              <HelpCircle className="mx-auto text-rowina-blue" size={48} />
              <h3 className="text-white font-bold text-lg uppercase tracking-widest">Need Advanced Support?</h3>
              <p className="text-zinc-400 text-sm max-w-xs mx-auto">
                For technical issues or custom feature requests, contact your system administrator.
              </p>
              <div className="pt-4">
                <p className="rowina-mono text-[10px] text-zinc-600 uppercase tracking-[0.2em]">Rowina Sales Tracker • Version 1.0.0</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <button 
        onClick={() => setIsSupportModalOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full rowina-pill-active flex items-center justify-center shadow-2xl z-40 hover:scale-110 transition-transform"
      >
        <MessageCircle size={28} />
      </button>

      {/* Modals (Simplified for token limit, but functional) */}
      <AnimatePresence>
        {(isProductModalOpen || isSaleModalOpen || isExpenseModalOpen || isRestockModalOpen || isAlertModalOpen || isClientModalOpen || isClientTransactionModalOpen || isStaffModalOpen || isStoreModalOpen || isSupportModalOpen || isQuotationModalOpen || isInvoiceModalOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsProductModalOpen(false); setIsSaleModalOpen(false); setIsExpenseModalOpen(false); setIsRestockModalOpen(false); setIsAlertModalOpen(false); setIsClientModalOpen(false); setIsClientTransactionModalOpen(false); setIsStaffModalOpen(false); setIsStoreModalOpen(false); setIsSupportModalOpen(false); setIsQuotationModalOpen(false); setIsInvoiceModalOpen(false); setModalSearch(''); }} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div 
              initial={{ y: 30, opacity: 0, scale: 0.98 }} 
              animate={{ y: 0, opacity: 1, scale: 1 }} 
              exit={{ y: 30, opacity: 0, scale: 0.98 }} 
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative bg-rowina-gray border border-zinc-800 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold rowina-title">
                  {isProductModalOpen ? (editingProduct ? 'EDIT STOCK' : 'NEW STOCK') : 
                   isSaleModalOpen ? 'ADD SALE' : 
                   isExpenseModalOpen ? 'ADD EXPENSE' : 
                   isRestockModalOpen ? 'RESTOCK STOCK' : 
                   isAlertModalOpen ? 'NEW ALERT' : 
                   isClientModalOpen ? 'NEW CLIENT' : 
                   isStaffModalOpen ? (editingStaff ? 'EDIT STAFF' : 'NEW STAFF') : 
                   isStoreModalOpen ? (editingStore ? 'EDIT STORE' : 'NEW STORE') : 
                   isQuotationModalOpen ? 'NEW QUOTE' :
                   isInvoiceModalOpen ? 'NEW INVOICE' :
                   isSupportModalOpen ? 'SUPPORT' : 'ADJUST DEBT'}
                </h3>
                <button onClick={() => { setIsProductModalOpen(false); setIsSaleModalOpen(false); setIsExpenseModalOpen(false); setIsRestockModalOpen(false); setIsAlertModalOpen(false); setIsClientModalOpen(false); setIsClientTransactionModalOpen(false); setIsStaffModalOpen(false); setIsStoreModalOpen(false); setIsSupportModalOpen(false); setIsQuotationModalOpen(false); setIsInvoiceModalOpen(false); setModalSearch(''); }} className="text-zinc-500 hover:text-white"><X size={24} /></button>
              </div>
              
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {isInvoiceModalOpen && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">CLIENT</label>
                      <div className="flex gap-2">
                        <select 
                          className="flex-1 bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none"
                          onChange={(e) => {
                            const client = clients.find(c => c.id === e.target.value);
                            if (client) setInvoiceForm({ ...invoiceForm, clientName: client.name, clientId: client.id });
                          }}
                        >
                          <option value="">SELECT EXISTING CLIENT</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id} selected={invoiceForm.clientId === c.id}>{c.name}</option>
                          ))}
                        </select>
                        <input 
                          type="text" 
                          placeholder="OR TYPE NAME" 
                          value={invoiceForm.clientName} 
                          onChange={e => setInvoiceForm({ ...invoiceForm, clientName: e.target.value, clientId: '' })} 
                          className="flex-1 bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none" 
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">ITEMS</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {invoiceForm.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-rowina-black p-3 rounded-xl border border-zinc-900">
                             <div>
                               <p className="text-xs font-bold text-white">{item.name}</p>
                               <div className="flex items-center gap-2 mt-1">
                                 <input 
                                   type="number" 
                                   value={item.quantity}
                                   onChange={(e) => {
                                     const items = [...(invoiceForm.items || [])];
                                     items[idx].quantity = Number(e.target.value);
                                     const total = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                                     setInvoiceForm({ ...invoiceForm, items, totalAmount: total });
                                   }}
                                   className="w-16 bg-zinc-800 rounded px-2 py-1 text-[10px] rowina-mono"
                                 />
                                 <span className="text-[8px] rowina-mono text-zinc-500 uppercase">@ {f(item.price)}</span>
                               </div>
                             </div>
                             <div className="text-right flex items-center gap-4">
                               <p className="text-[10px] font-bold text-white">{f(item.price * item.quantity)}</p>
                               <button onClick={() => {
                                 const items = [...(invoiceForm.items || [])];
                                 items.splice(idx, 1);
                                 const total = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                                 setInvoiceForm({ ...invoiceForm, items, totalAmount: total });
                               }} className="text-zinc-600 hover:text-rose-500 transition-colors"><X size={14} /></button>
                             </div>
                          </div>
                        ))}
                      </div>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                        <input 
                          type="text" 
                          placeholder="SEARCH STORE ITEMS..." 
                          value={modalSearch}
                          onChange={e => setModalSearch(e.target.value)}
                          className="w-full bg-rowina-black border border-zinc-800 rounded-2xl pl-12 pr-6 py-4 text-sm focus:border-rowina-blue outline-none"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-2 custom-scrollbar border border-zinc-900 rounded-xl p-2 bg-black/20">
                        {products
                          .filter(p => p.name.toLowerCase().includes(modalSearch.toLowerCase()) || p.category.toLowerCase().includes(modalSearch.toLowerCase()))
                          .map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                const exists = invoiceForm.items?.find(i => i.productId === p.id);
                                if (exists) return;
                                const items = [...(invoiceForm.items || []), { productId: p.id, name: p.name, price: p.sellingPrice, quantity: 1 }];
                                const total = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                                setInvoiceForm({ ...invoiceForm, items, totalAmount: total });
                                setModalSearch('');
                              }}
                              className="w-full text-left px-4 py-3 text-[10px] rowina-mono group flex justify-between items-center hover:bg-zinc-800/50 rounded-xl transition-all"
                            >
                              <div>
                                <p className="text-zinc-400 group-hover:text-white font-bold">{p.name}</p>
                                <p className="text-[8px] text-zinc-600 uppercase">{p.category}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-rowina-blue">{f(p.sellingPrice)}</p>
                                <p className="text-[10px] text-zinc-500 uppercase">STOCK: {p.stockQuantity}</p>
                              </div>
                            </button>
                          ))
                        }
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <label className="text-[10px] rowina-mono text-zinc-500 ml-2">PAID AMOUNT</label>
                         <input type="number" value={invoiceForm.paidAmount ?? 0} onChange={e => setInvoiceForm({ ...invoiceForm, paidAmount: Number(e.target.value) })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none" />
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] rowina-mono text-zinc-500 ml-2">STATUS</label>
                         <select value={invoiceForm.status} onChange={e => setInvoiceForm({ ...invoiceForm, status: e.target.value as any })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none">
                            <option value="Pending">PENDING</option>
                            <option value="Partial">PARTIAL</option>
                            <option value="Paid">PAID</option>
                         </select>
                       </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
                      <div>
                        <p className="rowina-mono text-[10px] text-zinc-500 uppercase">INVOICE TOTAL</p>
                        <p className="text-[8px] rowina-mono text-zinc-600 uppercase">BALANCE: {f((invoiceForm.totalAmount || 0) - (invoiceForm.paidAmount || 0))}</p>
                      </div>
                      <p className="text-3xl font-bold text-emerald-500">{f(invoiceForm.totalAmount || 0)}</p>
                    </div>
                    <button onClick={handleAddInvoice} disabled={isSubmitting} className="w-full py-5 rounded-2xl font-bold rowina-mono text-sm tracking-widest uppercase transition-all rowina-pill-active">
                      {isSubmitting ? 'PROCESSING...' : 'GENERATE INVOICE'}
                    </button>
                  </div>
                )}

                {isQuotationModalOpen && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">CLIENT</label>
                      <div className="flex gap-2">
                        <select 
                          className="flex-1 bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none"
                          onChange={(e) => {
                            const client = clients.find(c => c.id === e.target.value);
                            if (client) setQuotationForm({ ...quotationForm, clientName: client.name, clientId: client.id });
                          }}
                        >
                          <option value="">SELECT EXISTING CLIENT</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id} selected={quotationForm.clientId === c.id}>{c.name}</option>
                          ))}
                        </select>
                        <input 
                          type="text" 
                          placeholder="OR TYPE NAME" 
                          value={quotationForm.clientName} 
                          onChange={e => setQuotationForm({ ...quotationForm, clientName: e.target.value, clientId: '' })} 
                          className="flex-1 bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none" 
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">ITEMS</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {quotationForm.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-rowina-black p-3 rounded-xl border border-zinc-900">
                             <div>
                               <p className="text-xs font-bold text-white">{item.name}</p>
                               <div className="flex items-center gap-2 mt-1">
                                 <input 
                                   type="number" 
                                   value={item.quantity}
                                   onChange={(e) => {
                                     const items = [...(quotationForm.items || [])];
                                     items[idx].quantity = Number(e.target.value);
                                     const total = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                                     setQuotationForm({ ...quotationForm, items, totalAmount: total });
                                   }}
                                   className="w-16 bg-zinc-800 rounded px-2 py-1 text-[10px] rowina-mono"
                                 />
                                 <span className="text-[8px] rowina-mono text-zinc-500 uppercase ml-2">@ {f(item.price)}</span>
                               </div>
                             </div>
                             <div className="text-right flex items-center gap-4">
                               <p className="text-[10px] font-bold text-white">{f(item.price * item.quantity)}</p>
                               <button onClick={() => {
                                 const items = [...(quotationForm.items || [])];
                                 items.splice(idx, 1);
                                 const total = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                                 setQuotationForm({ ...quotationForm, items, totalAmount: total });
                               }} className="text-zinc-600 hover:text-rose-500 transition-colors"><X size={14} /></button>
                             </div>
                          </div>
                        ))}
                      </div>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                        <input 
                          type="text" 
                          placeholder="SEARCH STORE ITEMS..." 
                          value={modalSearch}
                          onChange={e => setModalSearch(e.target.value)}
                          className="w-full bg-rowina-black border border-zinc-800 rounded-2xl pl-12 pr-6 py-4 text-sm focus:border-rowina-blue outline-none"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-2 custom-scrollbar border border-zinc-900 rounded-xl p-2 bg-black/20">
                        {products
                          .filter(p => p.name.toLowerCase().includes(modalSearch.toLowerCase()) || p.category.toLowerCase().includes(modalSearch.toLowerCase()))
                          .map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                const exists = quotationForm.items?.find(i => i.productId === p.id);
                                if (exists) return;
                                const items = [...(quotationForm.items || []), { productId: p.id, name: p.name, price: p.sellingPrice, quantity: 1 }];
                                const total = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                                setQuotationForm({ ...quotationForm, items, totalAmount: total });
                                setModalSearch('');
                              }}
                              className="w-full text-left px-4 py-3 text-[10px] rowina-mono group flex justify-between items-center hover:bg-zinc-800/50 rounded-xl transition-all"
                            >
                              <div>
                                <p className="text-zinc-400 group-hover:text-white font-bold">{p.name}</p>
                                <p className="text-[8px] text-zinc-600 uppercase">{p.category}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-rowina-blue">{f(p.sellingPrice)}</p>
                                <p className="text-[10px] text-zinc-500 uppercase">STOCK: {p.stockQuantity}</p>
                              </div>
                            </button>
                          ))
                        }
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
                      <p className="rowina-mono text-[10px] text-zinc-500 uppercase">QUOTATION ESTIMATE</p>
                      <p className="text-3xl font-bold text-rowina-blue">{f(quotationForm.totalAmount || 0)}</p>
                    </div>
                    <button onClick={handleAddQuotation} disabled={isSubmitting} className="w-full py-5 rounded-2xl font-bold rowina-mono text-sm tracking-widest uppercase transition-all rowina-pill-active">
                      {isSubmitting ? 'PROCESSING...' : 'GENERATE QUOTATION'}
                    </button>
                  </div>
                )}

                {isStoreModalOpen && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">STORE NAME</label>
                      <input type="text" placeholder="NAME" value={storeForm.name} onChange={e => setStoreForm({ ...storeForm, name: e.target.value })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">LOCATION</label>
                      <input type="text" placeholder="LOCATION" value={storeForm.location} onChange={e => setStoreForm({ ...storeForm, location: e.target.value })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none" />
                    </div>
                    <button 
                      onClick={handleAddStore} 
                      disabled={isSubmitting}
                      className={cn(
                        "w-full py-5 rounded-2xl font-bold rowina-mono text-sm tracking-widest uppercase transition-all",
                        isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "rowina-pill-active"
                      )}
                    >
                      {isSubmitting ? 'PROCESSING...' : (editingStore ? 'Update Store' : 'Initialize Store')}
                    </button>
                  </>
                )}
                {isStaffModalOpen && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">DISPLAY NAME</label>
                      <input type="text" placeholder="NAME" value={staffForm.displayName} onChange={e => setStaffForm({ ...staffForm, displayName: e.target.value })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">EMAIL ADDRESS</label>
                      <input type="email" placeholder="EMAIL" value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none" disabled={!!editingStaff} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">ASSIGN LOGIN PASSWORD</label>
                      <input type="text" placeholder="STAFF PASSWORD" value={staffForm.tempPassword} onChange={e => setStaffForm({ ...staffForm, tempPassword: e.target.value })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none font-mono" />
                      <p className="text-[8px] text-zinc-600 px-2 uppercase tracking-tight">Set a simple password for the staff to use during identification.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">USER ROLE</label>
                      <div className="flex bg-rowina-black p-1 rounded-2xl border border-zinc-800">
                        <button 
                          onClick={() => setStaffForm({ ...staffForm, role: 'employee' })}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-[10px] font-bold rowina-mono transition-all",
                            staffForm.role === 'employee' ? "bg-zinc-700 text-white" : "text-zinc-500"
                          )}
                        >
                          STAFF
                        </button>
                        <button 
                          onClick={() => setStaffForm({ ...staffForm, role: 'executive' })}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-[10px] font-bold rowina-mono transition-all",
                            staffForm.role === 'executive' ? "bg-rowina-blue text-black" : "text-zinc-500"
                          )}
                        >
                          EXECUTIVE
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">ASSIGNED STORES</label>
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
                              "px-4 py-3 rounded-xl text-[8px] font-bold rowina-mono transition-all border",
                              staffForm.assignedStoreIds?.includes(store.id) 
                                ? "bg-rowina-blue/10 border-rowina-blue text-rowina-blue" 
                                : "bg-rowina-black border-zinc-800 text-zinc-500"
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
                        "w-full py-5 rounded-2xl font-bold rowina-mono text-sm tracking-widest uppercase transition-all",
                        isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "rowina-pill-active"
                      )}
                    >
                      {isSubmitting ? 'PROCESSING...' : (editingStaff ? 'Update Profile' : 'Authorize Staff')}
                    </button>
                  </>
                )}
                {isAlertModalOpen && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">ALERT NAME</label>
                      <input type="text" placeholder="ALERT NAME" value={alertForm.name} onChange={e => setAlertForm({ ...alertForm, name: e.target.value })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">ALERT TYPE</label>
                      <select 
                        value={alertForm.type} 
                        onChange={e => setAlertForm({ ...alertForm, type: e.target.value as AlertType })} 
                        className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none appearance-none"
                      >
                        <option value="LOW_STOCK">LOW STOCK WARNING</option>
                        <option value="SALES_TARGET">SALES TARGET REACHED</option>
                        <option value="PROFIT_MARGIN">PROFIT MARGIN DROP</option>
                        <option value="SALES_VELOCITY">SALES VELOCITY SPIKE</option>
                      </select>
                    </div>
                    {(alertForm.type === 'LOW_STOCK' || alertForm.type === 'SALES_VELOCITY') && (
                      <div className="space-y-2">
                        <label className="text-[10px] rowina-mono text-zinc-500 ml-2">TARGET PRODUCT</label>
                        <select 
                          value={alertForm.targetId} 
                          onChange={e => setAlertForm({ ...alertForm, targetId: e.target.value })} 
                          className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none appearance-none"
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
                        className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none" 
                      />
                    </div>
                    <button 
                      onClick={handleAddAlert} 
                      disabled={isSubmitting}
                      className={cn(
                        "w-full py-5 rounded-2xl font-bold rowina-mono text-sm tracking-widest transition-all",
                        isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "rowina-pill-active"
                      )}
                    >
                      {isSubmitting ? 'PROCESSING...' : 'INITIALIZE SURVEILLANCE'}
                    </button>
                  </>
                )}

                {isClientModalOpen && (
                  <>
                    <h2 className="text-xl font-bold rowina-title mb-6 uppercase tracking-widest">
                      {editingClient ? 'Edit Client Profile' : 'Register New Client'}
                    </h2>
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">CLIENT NAME</label>
                      <input type="text" placeholder="FULL NAME" value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">PHONE NUMBER</label>
                      <input type="text" placeholder="PHONE" value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none" />
                    </div>

                    <button 
                      onClick={handleAddClient} 
                      disabled={isSubmitting}
                      className={cn(
                        "w-full py-5 rounded-2xl font-bold rowina-mono text-sm tracking-widest uppercase transition-all",
                        isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "rowina-pill-active"
                      )}
                    >
                      {isSubmitting ? 'PROCESSING...' : (editingClient ? 'Update Client' : 'Register Client')}
                    </button>
                  </>
                )}

                {isClientTransactionModalOpen && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">TRANSACTION TYPE</label>
                      <div className="flex bg-rowina-black p-1 rounded-2xl border border-zinc-800">
                        <button 
                          onClick={() => setClientTransactionForm({ ...clientTransactionForm, type: 'CREDIT' })}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-[10px] font-bold rowina-mono transition-all",
                            clientTransactionForm.type === 'CREDIT' ? "bg-rose-500 text-white" : "text-zinc-500"
                          )}
                        >
                          INCREASE DEBT
                        </button>
                        <button 
                          onClick={() => setClientTransactionForm({ ...clientTransactionForm, type: 'PAYMENT' })}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-[10px] font-bold rowina-mono transition-all",
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
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">STOCK NAME</label>
                      <input type="text" placeholder="STOCK NAME" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">STOCK</label>
                      <input 
                        type="number" 
                        placeholder="STOCK" 
                        value={productForm.stockQuantity ?? ''} 
                        onChange={e => {
                          const val = e.target.value;
                          setProductForm({ ...productForm, stockQuantity: val === '' ? undefined : Number(val) });
                        }} 
                        className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] rowina-mono text-zinc-500 ml-2">BUYING PRICE</label>
                        <input 
                          type="number" 
                          placeholder="BUYING" 
                          value={productForm.buyingPrice ?? ''} 
                          onChange={e => {
                            const val = e.target.value;
                            setProductForm({ ...productForm, buyingPrice: val === '' ? undefined : Number(val) });
                          }} 
                          className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] rowina-mono text-zinc-500 ml-2">SELLING PRICE</label>
                        <input 
                          type="number" 
                          placeholder="SELLING" 
                          value={productForm.sellingPrice ?? ''} 
                          onChange={e => {
                            const val = e.target.value;
                            setProductForm({ ...productForm, sellingPrice: val === '' ? undefined : Number(val) });
                          }} 
                          className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none" 
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleAddProduct} 
                      disabled={isSubmitting}
                      className={cn(
                        "w-full py-5 rounded-2xl font-bold rowina-mono text-sm tracking-widest transition-all",
                        isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "rowina-pill-active"
                      )}
                    >
                      {isSubmitting ? 'PROCESSING...' : (editingProduct ? 'UPDATE PRODUCT' : 'ADD PRODUCT')}
                    </button>
                  </>
                )}

                {isSaleModalOpen && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">TARGET STOCK</label>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                        <input 
                          type="text" 
                          placeholder="SEARCH STOCK..." 
                          value={modalSearch}
                          onChange={e => setModalSearch(e.target.value)}
                          className="w-full bg-rowina-black border border-zinc-800 rounded-2xl pl-10 pr-4 py-3 text-xs rowina-mono focus:border-rowina-blue outline-none mb-2"
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
                                "w-full text-left px-4 py-3 rounded-xl text-xs rowina-mono transition-all border",
                                saleForm.productId === p.id 
                                  ? "bg-rowina-blue/20 border-rowina-blue text-rowina-blue" 
                                  : "bg-rowina-black border-zinc-800 text-zinc-400 hover:border-zinc-600"
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
                          <p className="text-center py-4 text-[10px] rowina-mono text-zinc-600">NO MATCHING STOCK FOUND</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] rowina-mono text-zinc-500 ml-2">QUANTITY</label>
                        <input 
                          type="number" 
                          placeholder="QUANTITY" 
                          value={saleForm.quantity ?? ''} 
                          onChange={e => {
                            const val = e.target.value;
                            setSaleForm({ ...saleForm, quantity: val === '' ? undefined : Number(val) });
                          }} 
                          className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] rowina-mono text-zinc-500 ml-2">DISCOUNT</label>
                        <input 
                          type="number" 
                          placeholder="DISCOUNT" 
                          value={saleForm.discount ?? ''} 
                          onChange={e => {
                            const val = e.target.value;
                            setSaleForm({ ...saleForm, discount: val === '' ? undefined : Number(val) });
                          }} 
                          className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">PAYMENT METHOD</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['Cash', 'Credit', 'Mobile Money Transfer', 'Cheque', 'Bank'] as PaymentMethod[]).map(method => (
                          <button
                            key={method}
                            onClick={() => setSaleForm({ ...saleForm, paymentMethod: method })}
                            className={cn(
                              "py-2 px-1 rounded-xl text-[8px] rowina-mono border transition-all",
                              saleForm.paymentMethod === method
                                ? "bg-rowina-blue/20 border-rowina-blue text-rowina-blue"
                                : "bg-rowina-black border-zinc-800 text-zinc-500 hover:border-zinc-700"
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
                        "w-full py-5 rounded-2xl font-bold rowina-mono text-sm tracking-widest transition-all",
                        isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "rowina-pill-active"
                      )}
                    >
                      {isSubmitting ? 'PROCESSING...' : 'CONFIRM SALE'}
                    </button>
                  </>
                )}
                
                {isRestockModalOpen && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">TARGET STOCK</label>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                        <input 
                          type="text" 
                          placeholder="SEARCH STOCK..." 
                          value={modalSearch}
                          onChange={e => setModalSearch(e.target.value)}
                          className="w-full bg-rowina-black border border-zinc-800 rounded-2xl pl-10 pr-4 py-3 text-xs rowina-mono focus:border-rowina-blue outline-none mb-2"
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
                                "w-full text-left px-4 py-3 rounded-xl text-xs rowina-mono transition-all border",
                                restockForm.productId === p.id 
                                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-500" 
                                  : "bg-rowina-black border-zinc-800 text-zinc-400 hover:border-zinc-600"
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
                        <label className="text-[10px] rowina-mono text-zinc-500 ml-2">RESTOCK QTY</label>
                        <input 
                          type="number" 
                          placeholder="QUANTITY" 
                          value={restockForm.quantity ?? ''} 
                          onChange={e => {
                            const val = e.target.value;
                            setRestockForm({ ...restockForm, quantity: val === '' ? undefined : Number(val) });
                          }} 
                          className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] rowina-mono text-zinc-500 ml-2">UNIT COST</label>
                        <input 
                          type="number" 
                          placeholder="COST" 
                          value={restockForm.unitCost ?? ''} 
                          onChange={e => {
                            const val = e.target.value;
                            setRestockForm({ ...restockForm, unitCost: val === '' ? undefined : Number(val) });
                          }} 
                          className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none" 
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleAddRestock} 
                      disabled={isSubmitting}
                      className={cn(
                        "w-full py-5 rounded-2xl font-bold rowina-mono text-sm tracking-widest transition-all",
                        isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-emerald-500 text-black hover:bg-emerald-400"
                      )}
                    >
                      {isSubmitting ? 'PROCESSING...' : 'CONFIRM RESTOCK'}
                    </button>
                  </>
                )}

                {isExpenseModalOpen && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">CATEGORY</label>
                      <select 
                        value={expenseForm.category} 
                        onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })} 
                        className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none appearance-none"
                      >
                        {['Rent', 'Utilities', 'Supplies', 'Wages', 'Other']
                          .map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)
                        }
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">DESCRIPTION</label>
                      <input type="text" placeholder="DESCRIPTION" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">AMOUNT</label>
                      <input 
                        type="number" 
                        placeholder="AMOUNT" 
                        value={expenseForm.amount ?? ''} 
                        onChange={e => {
                          const val = e.target.value;
                          setExpenseForm({ ...expenseForm, amount: val === '' ? undefined : Number(val) });
                        }} 
                        className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none" 
                      />
                    </div>
                    <button 
                      onClick={handleAddExpense} 
                      disabled={isSubmitting}
                      className={cn(
                        "w-full py-5 rounded-2xl font-bold rowina-mono text-sm tracking-widest transition-all",
                        isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "rowina-pill-active"
                      )}
                    >
                      {isSubmitting ? 'PROCESSING...' : 'CONFIRM EXPENDITURE'}
                    </button>
                  </>
                )}

                {isSupportModalOpen && (
                  <div className="space-y-6">
                    <div className="bg-rowina-black/50 p-6 rounded-3xl border border-zinc-800 space-y-4">
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        Need assistance with Rowina Sales Tracker? Contact our executive support line or check the help documentation.
                      </p>
                      <div className="space-y-3">
                        <a href="tel:+123456789" className="flex items-center gap-4 p-4 bg-zinc-900 rounded-2xl border border-zinc-800 hover:border-rowina-blue transition-colors">
                          <div className="p-2 bg-rowina-blue/10 text-rowina-blue rounded-lg">
                            <HelpCircle size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white uppercase tracking-tight">Executive Support</p>
                            <p className="rowina-mono text-[9px] text-zinc-500">+123 456 789</p>
                          </div>
                        </a>
                        <button 
                          onClick={() => { setIsSupportModalOpen(false); setActiveTab('help'); }}
                          className="w-full flex items-center gap-4 p-4 bg-zinc-900 rounded-2xl border border-zinc-800 hover:border-rowina-blue transition-colors"
                        >
                          <div className="p-2 bg-rowina-blue/10 text-rowina-blue rounded-lg">
                            <FileText size={18} />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-bold text-white uppercase tracking-tight">Help Documentation</p>
                            <p className="rowina-mono text-[9px] text-zinc-500">View User Guides</p>
                          </div>
                        </button>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsSupportModalOpen(false)}
                      className="w-full bg-zinc-800 text-white py-4 rounded-2xl font-bold rowina-mono text-[10px] tracking-widest hover:bg-zinc-700 transition-colors"
                    >
                      CLOSE
                    </button>
                  </div>
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
              className="bg-rowina-gray w-full max-w-md rounded-[40px] border border-zinc-800 p-8 relative z-10 space-y-8"
            >
              <div className="space-y-2">
                <p className="rowina-mono text-[10px] text-rowina-blue uppercase tracking-widest">AUTHENTICATION REQUIRED</p>
                <h2 className="text-2xl font-bold text-white leading-tight">Enter Executive Password</h2>
                <p className="text-zinc-500 text-xs">This area contains sensitive financial data and administrative controls.</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="rowina-mono text-[10px] text-zinc-500 uppercase tracking-widest">PASSWORD</label>
                  <input 
                    type="password"
                    value={authModal.password}
                    onChange={(e) => setAuthModal(prev => ({ ...prev, password: e.target.value as any, error: '' }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-rowina-blue transition-all"
                    placeholder="••••••••"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAuthSubmit();
                    }}
                  />
                  {authModal.error && <p className="text-rose-500 text-[10px] rowina-mono uppercase">{authModal.error}</p>}
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setAuthModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 bg-zinc-800 text-white py-4 rounded-2xl font-bold rowina-mono text-xs tracking-widest hover:bg-zinc-700 transition-all"
                >
                  CANCEL
                </button>
                <button 
                  onClick={handleAuthSubmit}
                  disabled={isSubmitting}
                  className={cn(
                    "flex-1 py-4 rounded-2xl font-bold rowina-mono text-xs tracking-widest transition-all",
                    isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-rowina-blue text-black hover:bg-blue-600"
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
              className="bg-rowina-gray w-full max-w-md rounded-[40px] border border-zinc-800 p-8 relative z-10 space-y-8"
            >
              <div className="space-y-2">
                <p className="rowina-mono text-[10px] text-rowina-blue uppercase tracking-widest">{confirmModal.title}</p>
                <h2 className="text-2xl font-bold text-white leading-tight">{confirmModal.message}</h2>
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 bg-zinc-800 text-white py-4 rounded-2xl font-bold rowina-mono text-xs tracking-widest hover:bg-zinc-700 transition-all"
                >
                  CANCEL
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  disabled={isSubmitting}
                  className={cn(
                    "flex-1 py-4 rounded-2xl font-bold rowina-mono text-xs tracking-widest transition-all",
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
