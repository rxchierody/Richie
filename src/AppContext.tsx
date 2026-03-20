import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, doc, getDoc, deleteDoc, setDoc, query, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Product, Sale, Expense, Restock, UserRole, Client, TriggeredAlert, AlertRule, Store, UserProfile, ClientTransaction } from './types';
import { parseISO, subDays, format, startOfDay } from 'date-fns';
import { round, formatCurrency } from './lib/utils';

export type Tab = 'portfolio' | 'store' | 'calendar' | 'alerts' | 'clients' | 'reports' | 'staff' | 'stores' | 'security' | 'help';
export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface AppContextType {
  user: any;
  userRole: UserRole;
  userProfile: UserProfile | null;
  isAuthReady: boolean;
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  restocks: Restock[];
  clients: Client[];
  alerts: AlertRule[];
  triggeredAlerts: TriggeredAlert[];
  stores: Store[];
  selectedStoreId: string;
  setSelectedStoreId: (id: string) => void;
  paymentMethodFilter: string;
  setPaymentMethodFilter: (filter: string) => void;
  executivePassword: string;
  setExecutivePassword: (password: string) => void;
  stats: any;
  chartData: any;
  recentLogs: any;
  isAlertModalOpen: boolean;
  setIsAlertModalOpen: (open: boolean) => void;
  isProductModalOpen: boolean;
  setIsProductModalOpen: (open: boolean) => void;
  isSaleModalOpen: boolean;
  setIsSaleModalOpen: (open: boolean) => void;
  isExpenseModalOpen: boolean;
  setIsExpenseModalOpen: (open: boolean) => void;
  isRestockModalOpen: boolean;
  setIsRestockModalOpen: (open: boolean) => void;
  isClientModalOpen: boolean;
  setIsClientModalOpen: (open: boolean) => void;
  isClientTransactionModalOpen: boolean;
  setIsClientTransactionModalOpen: (open: boolean) => void;
  isStaffModalOpen: boolean;
  setIsStaffModalOpen: (open: boolean) => void;
  isStoreModalOpen: boolean;
  setIsStoreModalOpen: (open: boolean) => void;
  productForm: Partial<Product>;
  setProductForm: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  saleForm: Partial<Sale>;
  setSaleForm: React.Dispatch<React.SetStateAction<Partial<Sale>>>;
  expenseForm: Partial<Expense>;
  setExpenseForm: React.Dispatch<React.SetStateAction<Partial<Expense>>>;
  restockForm: Partial<Restock>;
  setRestockForm: React.Dispatch<React.SetStateAction<Partial<Restock>>>;
  clientForm: Partial<Client>;
  setClientForm: React.Dispatch<React.SetStateAction<Partial<Client>>>;
  clientTransactionForm: Partial<ClientTransaction>;
  setClientTransactionForm: React.Dispatch<React.SetStateAction<Partial<ClientTransaction>>>;
  alertForm: Partial<AlertRule>;
  setAlertForm: React.Dispatch<React.SetStateAction<Partial<AlertRule>>>;
  staffForm: Partial<UserProfile>;
  setStaffForm: React.Dispatch<React.SetStateAction<Partial<UserProfile>>>;
  storeForm: Partial<Store>;
  setStoreForm: React.Dispatch<React.SetStateAction<Partial<Store>>>;
  handleAddProduct: () => Promise<void>;
  handleAddSale: () => Promise<void>;
  handleAddExpense: () => Promise<void>;
  handleAddRestock: () => Promise<void>;
  handleAddClient: () => Promise<void>;
  handleAddClientTransaction: () => Promise<void>;
  handleAddAlert: () => Promise<void>;
  handleAddStaff: () => Promise<void>;
  handleAddStore: () => Promise<void>;
  isSubmitting: boolean;
  modalSearch: string;
  setModalSearch: (search: string) => void;
  editingProduct: Product | null;
  setEditingProduct: (product: Product | null) => void;
  editingClient: Client | null;
  setEditingClient: (client: Client | null) => void;
  editingStaff: UserProfile | null;
  setEditingStaff: (staff: UserProfile | null) => void;
  editingStore: Store | null;
  setEditingStore: (store: Store | null) => void;
  authModal: any;
  setAuthModal: React.Dispatch<React.SetStateAction<any>>;
  confirmModal: any;
  setConfirmModal: React.Dispatch<React.SetStateAction<any>>;
  currencyCode: string;
  setCurrencyCode: (code: string) => void;
  appLockConfig: { type: 'pin' | 'password' | null; value: string | null };
  setAppLockConfig: (config: { type: 'pin' | 'password' | null; value: string | null }) => void;
  isAppLocked: boolean;
  setIsAppLocked: (locked: boolean) => void;
  showInstallButton: boolean;
  handleInstallClick: () => Promise<void>;
  isIOS: boolean;
  isStandalone: boolean;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  timePeriod: TimePeriod;
  setTimePeriod: (period: TimePeriod) => void;
  f: (amount: number) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<UserRole>('employee');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [restocks, setRestocks] = useState<Restock[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL');
  const [executivePassword, setExecutivePassword] = useState<string>('');
  const [authModal, setAuthModal] = useState({ isOpen: false, targetRole: 'executive' as UserRole, password: '', error: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Modal States
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isClientTransactionModalOpen, setIsClientTransactionModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);

  // Form States
  const [productForm, setProductForm] = useState<Partial<Product>>({ name: '', buyingPrice: 0, sellingPrice: 0, stockQuantity: 0, unit: 'pcs', category: 'General' });
  const [saleForm, setSaleForm] = useState<Partial<Sale>>({ productId: '', quantity: 1, discount: 0, paymentMethod: 'Cash' });
  const [expenseForm, setExpenseForm] = useState<Partial<Expense>>({ category: 'Other', description: '', amount: 0 });
  const [restockForm, setRestockForm] = useState<Partial<Restock>>({ productId: '', quantity: 0, unitCost: 0 });
  const [clientForm, setClientForm] = useState<Partial<Client>>({ name: '', phone: '', email: '', totalDebt: 0 });
  const [clientTransactionForm, setClientTransactionForm] = useState<Partial<ClientTransaction>>({ type: 'CREDIT', amount: 0, description: '' });
  const [alertForm, setAlertForm] = useState<Partial<AlertRule>>({ type: 'LOW_STOCK', threshold: 10, isActive: true });
  const [staffForm, setStaffForm] = useState<Partial<UserProfile>>({ displayName: '', email: '', role: 'employee', assignedStoreIds: [] });
  const [storeForm, setStoreForm] = useState<Partial<Store>>({ name: '', location: '' });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
  const [editingStore, setEditingStore] = useState<Store | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('portfolio');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('daily');
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
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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

  // Handlers
  const handleAddProduct = async () => {
    if (!productForm.name || !productForm.buyingPrice || !productForm.sellingPrice) return;
    setIsSubmitting(true);
    try {
      const data = { ...productForm, storeId: selectedStoreId === 'ALL' ? (stores[0]?.id || 'default') : selectedStoreId };
      if (editingProduct) {
        await setDoc(doc(db, 'products', editingProduct.id), data, { merge: true });
      } else {
        await setDoc(doc(collection(db, 'products')), data);
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error("Error adding product:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSale = async () => {
    if (!saleForm.productId || !saleForm.quantity) return;
    const product = products.find(p => p.id === saleForm.productId);
    if (!product || product.stockQuantity < (saleForm.quantity || 0)) return;

    setIsSubmitting(true);
    try {
      const saleData = {
        ...saleForm,
        date: format(new Date(), 'yyyy-MM-dd'),
        timestamp: new Date().toISOString(),
        sellingPrice: product.sellingPrice,
        storeId: product.storeId
      };
      await setDoc(doc(collection(db, 'sales')), saleData);
      await setDoc(doc(db, 'products', product.id), {
        stockQuantity: product.stockQuantity - (saleForm.quantity || 0)
      }, { merge: true });
      setIsSaleModalOpen(false);
    } catch (error) {
      console.error("Error adding sale:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.amount || !expenseForm.description) return;
    setIsSubmitting(true);
    try {
      const data = {
        ...expenseForm,
        date: format(new Date(), 'yyyy-MM-dd'),
        timestamp: new Date().toISOString(),
        storeId: selectedStoreId === 'ALL' ? (stores[0]?.id || 'default') : selectedStoreId
      };
      await setDoc(doc(collection(db, 'expenses')), data);
      setIsExpenseModalOpen(false);
    } catch (error) {
      console.error("Error adding expense:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRestock = async () => {
    if (!restockForm.productId || !restockForm.quantity) return;
    setIsSubmitting(true);
    try {
      const product = products.find(p => p.id === restockForm.productId);
      if (!product) return;

      const data = {
        ...restockForm,
        date: format(new Date(), 'yyyy-MM-dd'),
        timestamp: new Date().toISOString(),
        storeId: product.storeId
      };
      await setDoc(doc(collection(db, 'restocks')), data);
      await setDoc(doc(db, 'products', product.id), {
        stockQuantity: product.stockQuantity + (restockForm.quantity || 0)
      }, { merge: true });
      setIsRestockModalOpen(false);
    } catch (error) {
      console.error("Error adding restock:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddClient = async () => {
    if (!clientForm.name) return;
    setIsSubmitting(true);
    try {
      const data = { ...clientForm, storeId: selectedStoreId === 'ALL' ? (stores[0]?.id || 'default') : selectedStoreId };
      if (editingClient) {
        await setDoc(doc(db, 'clients', editingClient.id), data, { merge: true });
      } else {
        await setDoc(doc(collection(db, 'clients')), data);
      }
      setIsClientModalOpen(false);
      setEditingClient(null);
    } catch (error) {
      console.error("Error adding client:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddClientTransaction = async () => {
    if (!clientTransactionForm.amount || !editingClient) return;
    setIsSubmitting(true);
    try {
      const data = {
        ...clientTransactionForm,
        clientId: editingClient.id,
        date: format(new Date(), 'yyyy-MM-dd'),
        timestamp: new Date().toISOString(),
        storeId: editingClient.storeId
      };
      await setDoc(doc(collection(db, 'clientTransactions')), data);
      
      const newDebt = clientTransactionForm.type === 'CREDIT' 
        ? editingClient.totalDebt + (clientTransactionForm.amount || 0)
        : editingClient.totalDebt - (clientTransactionForm.amount || 0);
      
      await setDoc(doc(db, 'clients', editingClient.id), { totalDebt: newDebt }, { merge: true });
      setIsClientTransactionModalOpen(false);
    } catch (error) {
      console.error("Error adding client transaction:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAlert = async () => {
    if (!alertForm.threshold) return;
    setIsSubmitting(true);
    try {
      const data = { ...alertForm, storeId: selectedStoreId === 'ALL' ? (stores[0]?.id || 'default') : selectedStoreId };
      await setDoc(doc(collection(db, 'alerts')), data);
      setIsAlertModalOpen(false);
    } catch (error) {
      console.error("Error adding alert:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStaff = async () => {
    if (!staffForm.email || !staffForm.displayName) return;
    setIsSubmitting(true);
    try {
      const emailKey = staffForm.email.toLowerCase();
      if (editingStaff) {
        await setDoc(doc(db, 'users', editingStaff.id), staffForm, { merge: true });
      } else {
        await setDoc(doc(db, 'users', emailKey), staffForm);
      }
      setIsStaffModalOpen(false);
      setEditingStaff(null);
    } catch (error) {
      console.error("Error adding staff:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStore = async () => {
    if (!storeForm.name) return;
    setIsSubmitting(true);
    try {
      if (editingStore) {
        await setDoc(doc(db, 'stores', editingStore.id), storeForm, { merge: true });
      } else {
        await setDoc(doc(collection(db, 'stores')), storeForm);
      }
      setIsStoreModalOpen(false);
      setEditingStore(null);
    } catch (error) {
      console.error("Error adding store:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auth and User Profile Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const emailDocRef = doc(db, 'users', currentUser.email?.toLowerCase() || 'unknown');
        
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setUserProfile({ ...data, id: userDoc.id });
            setUserRole(data.role);
          } else {
            const emailDoc = await getDoc(emailDocRef);
            let role: UserRole = currentUser.email === 'richielwondo434@gmail.com' ? 'executive' : 'employee';
            let displayName = currentUser.displayName || '';
            let assignedStoreIds: string[] = [];

            if (emailDoc.exists()) {
              const data = emailDoc.data() as UserProfile;
              role = data.role;
              displayName = data.displayName || displayName;
              assignedStoreIds = data.assignedStoreIds || [];
              await deleteDoc(emailDocRef);
            }

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
          console.error("Auth sync error:", error);
        }
      } else {
        setUserRole('employee');
        setUserProfile(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Sync Executive Password
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setExecutivePassword(doc.data().executivePassword || '');
      }
    });
    return () => unsubSettings();
  }, []);

  // Firestore Real-time Sync
  useEffect(() => {
    if (!isAuthReady) return;

    const unsubStores = onSnapshot(collection(db, 'stores'), (snapshot) => {
      const storesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Store));
      setStores(storesData);
      
      if (selectedStoreId !== 'ALL') {
        if (!storesData.find(s => s.id === selectedStoreId)) {
          setSelectedStoreId('ALL');
        }
      } else if (userRole !== 'executive' && storesData.length > 0) {
        setSelectedStoreId(storesData[0].id);
      }
    });

    const getQuery = (colName: string) => {
      let baseQuery = collection(db, colName);
      if (selectedStoreId !== 'ALL') {
        return query(baseQuery, where('storeId', '==', selectedStoreId));
      }
      return query(baseQuery);
    };

    const unsubProducts = onSnapshot(getQuery('products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product)));
    });

    const unsubSales = onSnapshot(getQuery('sales'), (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Sale)));
    });

    const unsubExpenses = onSnapshot(getQuery('expenses'), (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense)));
    });

    const unsubRestocks = onSnapshot(getQuery('restocks'), (snapshot) => {
      setRestocks(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Restock)));
    });

    const unsubClients = onSnapshot(getQuery('clients'), (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Client)));
    });

    const unsubAlerts = onSnapshot(getQuery('alerts'), (snapshot) => {
      setAlerts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AlertRule)));
    });

    return () => {
      unsubStores();
      unsubProducts();
      unsubSales();
      unsubExpenses();
      unsubRestocks();
      unsubClients();
      unsubAlerts();
    };
  }, [isAuthReady, selectedStoreId, userRole]);

  const stats = useMemo(() => {
    const revenue = sales.reduce((acc, s) => acc + (s.quantity * s.sellingPrice - s.discount), 0);
    const expenseTotal = expenses.reduce((acc, e) => acc + e.amount, 0);
    const restockCost = restocks.reduce((acc, r) => acc + (r.quantity * r.unitCost), 0);
    
    const cogs = sales.reduce((acc, s) => {
      const product = products.find(p => p.id === s.productId);
      return acc + (s.quantity * (product?.buyingPrice || 0));
    }, 0);
    
    const netProfit = round(revenue - expenseTotal - cogs);
    
    return { revenue, expenseTotal, restockCost, netProfit };
  }, [sales, expenses, restocks, products]);

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

  const recentLogs = useMemo(() => {
    return [...sales, ...expenses, ...restocks]
      .filter(item => {
        if ('productId' in item && 'sellingPrice' in item) {
          return paymentMethodFilter === 'ALL' || (item as Sale).paymentMethod === paymentMethodFilter;
        }
        return true;
      })
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
      .slice(0, 10);
  }, [sales, expenses, restocks, paymentMethodFilter]);

  const requireAuth = (callback: () => void) => {
    if (userRole === 'executive') {
      callback();
    } else {
      setAuthModal({
        isOpen: true,
        targetRole: 'executive',
        password: '',
        error: ''
      });
    }
  };

  return (
    <AppContext.Provider value={{
      user, userRole, userProfile, isAuthReady, products, sales, expenses, restocks, clients, alerts, triggeredAlerts, stores,
      selectedStoreId, setSelectedStoreId, paymentMethodFilter, setPaymentMethodFilter, executivePassword, setExecutivePassword,
      stats, chartData, recentLogs, requireAuth, setAuthModal, setUserRole, setUserProfile,
      isAlertModalOpen, setIsAlertModalOpen, isProductModalOpen, setIsProductModalOpen, isSaleModalOpen, setIsSaleModalOpen,
      isExpenseModalOpen, setIsExpenseModalOpen, isRestockModalOpen, setIsRestockModalOpen, isClientModalOpen, setIsClientModalOpen,
      isClientTransactionModalOpen, setIsClientTransactionModalOpen, isStaffModalOpen, setIsStaffModalOpen, isStoreModalOpen, setIsStoreModalOpen,
      productForm, setProductForm, saleForm, setSaleForm, expenseForm, setExpenseForm, restockForm, setRestockForm,
      clientForm, setClientForm, clientTransactionForm, setClientTransactionForm, alertForm, setAlertForm,
      staffForm, setStaffForm, storeForm, setStoreForm, handleAddProduct, handleAddSale, handleAddExpense,
      handleAddRestock, handleAddClient, handleAddClientTransaction, handleAddAlert, handleAddStaff, handleAddStore,
      isSubmitting, modalSearch, setModalSearch, editingProduct, setEditingProduct, editingClient, setEditingClient,
      editingStaff, setEditingStaff, editingStore, setEditingStore, confirmModal, setConfirmModal,
      currencyCode, setCurrencyCode, appLockConfig, setAppLockConfig, isAppLocked, setIsAppLocked,
      showInstallButton, handleInstallClick, isIOS, isStandalone, activeTab, setActiveTab, timePeriod, setTimePeriod, f
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
