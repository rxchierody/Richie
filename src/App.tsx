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
  CreditCard
} from 'lucide-react';
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
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths,
  isToday
} from 'date-fns';
import { Product, Sale, Expense, ExpenseCategory, PaymentMethod, AlertRule, TriggeredAlert, AlertType, Restock, UserRole, Client, ClientTransaction } from './types';
import { cn, formatCurrency, calculateMarkup, calculateMargin } from './lib/utils';

type Tab = 'portfolio' | 'store' | 'calendar' | 'alerts' | 'clients';
type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

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
    <div className="bg-lethal-gray p-6 rounded-3xl border border-zinc-800">
      <p className="lethal-mono text-[10px] text-zinc-500 mb-2 uppercase">{label}</p>
      <div className="flex justify-between items-end">
        <p className={cn(
          "text-2xl font-bold",
          highlight === "emerald" ? "text-emerald-500" : highlight === "rose" ? "text-rose-500" : "text-white"
        )}>{value}</p>
        <div className={cn(
          "flex items-center gap-0.5 lethal-mono text-[8px] font-bold mb-1",
          isGood ? "text-emerald-500" : "text-rose-500"
        )}>
          {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {Math.abs(trend).toFixed(0)}%
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('portfolio');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('weekly');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | 'ALL'>('ALL');
  const [userRole, setUserRole] = useState<UserRole>('executive');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [restocks, setRestocks] = useState<Restock[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientTransactions, setClientTransactions] = useState<ClientTransaction[]>([]);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>([]);
  
  // Calendar States
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const getDayStats = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const daySales = sales.filter(s => s.date === dateStr);
    const dayExpenses = expenses.filter(e => e.date === dateStr);
    const dayRestocks = restocks.filter(r => r.date === dateStr);
    
    const revenue = daySales.reduce((acc, s) => acc + (s.quantity * s.sellingPrice - s.discount), 0);
    const totalExpenses = dayExpenses.reduce((acc, e) => acc + e.amount, 0);
    const restockCost = dayRestocks.reduce((acc, r) => acc + (r.quantity * r.unitCost), 0);
    
    const cogs = daySales.reduce((acc, s) => {
      const product = products.find(p => p.id === s.productId);
      return acc + (s.quantity * (product?.buyingPrice || 0));
    }, 0);
    
    const netProfit = revenue - cogs - totalExpenses;
    
    return { revenue, totalExpenses, netProfit, salesCount: daySales.length, restockCost };
  };

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isClientTransactionModalOpen, setIsClientTransactionModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Search States
  const [salesSearch, setSalesSearch] = useState('');
  const [expensesSearch, setExpensesSearch] = useState('');
  const [productsSearch, setProductsSearch] = useState('');
  const [clientsSearch, setClientsSearch] = useState('');
  const [modalSearch, setModalSearch] = useState('');

  // Form States
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '', sku: '', category: 'General', unit: 'pcs', stockQuantity: undefined, buyingPrice: undefined, sellingPrice: undefined
  });
  const [saleForm, setSaleForm] = useState<Partial<Sale>>({
    date: format(new Date(), 'yyyy-MM-dd'), productId: '', quantity: undefined, discount: undefined, paymentMethod: 'Cash'
  });
  const [expenseForm, setExpenseForm] = useState<Partial<Expense>>({
    date: format(new Date(), 'yyyy-MM-dd'), description: '', category: 'Other', amount: undefined
  });
  const [restockForm, setRestockForm] = useState<Partial<Restock>>({
    date: format(new Date(), 'yyyy-MM-dd'), productId: '', quantity: undefined, unitCost: undefined
  });
  const [alertForm, setAlertForm] = useState<Partial<AlertRule>>({
    name: '', type: 'LOW_STOCK', threshold: undefined, isActive: true
  });
  const [clientForm, setClientForm] = useState<Partial<Client>>({
    name: '', phone: '', email: '', totalDebt: undefined
  });
  const [clientTransactionForm, setClientTransactionForm] = useState<Partial<ClientTransaction>>({
    date: format(new Date(), 'yyyy-MM-dd'), type: 'CREDIT', amount: undefined, description: '', clientId: '', quantity: undefined
  });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Load initial data
  useEffect(() => {
    const savedProducts = localStorage.getItem('aura_products');
    const savedSales = localStorage.getItem('aura_sales');
    const savedExpenses = localStorage.getItem('aura_expenses');
    const savedAlerts = localStorage.getItem('aura_alerts');
    const savedTriggered = localStorage.getItem('aura_triggered');
    const savedRestocks = localStorage.getItem('aura_restocks');
    const savedClients = localStorage.getItem('aura_clients');
    const savedClientTransactions = localStorage.getItem('aura_client_transactions');
    
    if (savedProducts) setProducts(JSON.parse(savedProducts));
    if (savedSales) setSales(JSON.parse(savedSales));
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
    if (savedAlerts) setAlerts(JSON.parse(savedAlerts));
    if (savedTriggered) setTriggeredAlerts(JSON.parse(savedTriggered));
    if (savedRestocks) setRestocks(JSON.parse(savedRestocks));
    if (savedClients) setClients(JSON.parse(savedClients));
    if (savedClientTransactions) setClientTransactions(JSON.parse(savedClientTransactions));
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('aura_products', JSON.stringify(products));
    localStorage.setItem('aura_sales', JSON.stringify(sales));
    localStorage.setItem('aura_expenses', JSON.stringify(expenses));
    localStorage.setItem('aura_alerts', JSON.stringify(alerts));
    localStorage.setItem('aura_triggered', JSON.stringify(triggeredAlerts));
    localStorage.setItem('aura_restocks', JSON.stringify(restocks));
    localStorage.setItem('aura_clients', JSON.stringify(clients));
    localStorage.setItem('aura_client_transactions', JSON.stringify(clientTransactions));
  }, [products, sales, expenses, alerts, triggeredAlerts, restocks, clients, clientTransactions]);

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

      const revenue = periodSales.reduce((acc, sale) => acc + (sale.quantity * sale.sellingPrice - sale.discount), 0);
      const cogs = periodSales.reduce((acc, sale) => {
        const product = products.find(p => p.id === sale.productId);
        return acc + (sale.quantity * (product?.buyingPrice || 0));
      }, 0);
      const grossProfit = revenue - cogs;
      const totalExpenses = periodExpenses.reduce((acc, exp) => acc + exp.amount, 0);
      const netProfit = grossProfit - totalExpenses;
      const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      return { revenue, grossProfit, totalExpenses, netProfit, margin };
    };

    const now = new Date();
    let currentStart: Date;
    let previousStart: Date;
    let previousEnd: Date;

    switch (timePeriod) {
      case 'daily':
        currentStart = subDays(now, 1);
        previousStart = subDays(now, 2);
        previousEnd = subDays(now, 1);
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
              ruleId: alert.id,
              message: `OBJECTIVE REACHED: Sales target of ${formatCurrency(alert.threshold)} achieved! Current: ${formatCurrency(totalSales)}`,
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
  const handleAddProduct = () => {
    if (editingProduct) {
      setProducts(products.map(p => p.id === editingProduct.id ? { 
        ...productForm, 
        stockQuantity: productForm.stockQuantity || 0,
        buyingPrice: productForm.buyingPrice || 0,
        sellingPrice: productForm.sellingPrice || 0,
        id: p.id 
      } as Product : p));
      setEditingProduct(null);
    } else {
      const newProduct: Product = { 
        ...productForm as Product, 
        stockQuantity: productForm.stockQuantity || 0,
        buyingPrice: productForm.buyingPrice || 0,
        sellingPrice: productForm.sellingPrice || 0,
        id: Math.random().toString(36).substr(2, 9) 
      };
      setProducts([...products, newProduct]);
    }
    setProductForm({ name: '', sku: '', category: 'General', unit: 'pcs', stockQuantity: undefined, buyingPrice: undefined, sellingPrice: undefined });
    setIsProductModalOpen(false);
  };

  const handleAddSale = () => {
    const product = products.find(p => p.id === saleForm.productId);
    if (!product) return;
    const newSale: Sale = { 
      ...saleForm as Sale, 
      id: Math.random().toString(36).substr(2, 9), 
      quantity: saleForm.quantity || 0,
      discount: saleForm.discount || 0,
      sellingPrice: product.sellingPrice,
      paymentMethod: saleForm.paymentMethod || 'Cash'
    };
    setProducts(products.map(p => p.id === product.id ? { ...p, stockQuantity: p.stockQuantity - (saleForm.quantity || 0) } : p));
    setSales([...sales, newSale]);
    setSaleForm({ date: format(new Date(), 'yyyy-MM-dd'), productId: '', quantity: undefined, discount: undefined, paymentMethod: 'Cash' });
    setIsSaleModalOpen(false);
  };

  const handleAddExpense = () => {
    const newExpense: Expense = { 
      ...expenseForm as Expense, 
      amount: expenseForm.amount || 0,
      id: Math.random().toString(36).substr(2, 9) 
    };
    setExpenses([...expenses, newExpense]);
    setExpenseForm({ date: format(new Date(), 'yyyy-MM-dd'), description: '', category: 'Other', amount: undefined });
    setIsExpenseModalOpen(false);
  };

  const handleAddRestock = () => {
    const product = products.find(p => p.id === restockForm.productId);
    if (!product) return;
    const newRestock: Restock = { 
      ...restockForm as Restock, 
      id: Math.random().toString(36).substr(2, 9),
      quantity: restockForm.quantity || 0,
      unitCost: restockForm.unitCost || product.buyingPrice 
    };
    setProducts(products.map(p => p.id === product.id ? { ...p, stockQuantity: p.stockQuantity + (restockForm.quantity || 0) } : p));
    setRestocks([...restocks, newRestock]);
    setRestockForm({ date: format(new Date(), 'yyyy-MM-dd'), productId: '', quantity: undefined, unitCost: undefined });
    setIsRestockModalOpen(false);
  };

  const handleAddAlert = () => {
    const newAlert: AlertRule = { 
      ...alertForm as AlertRule, 
      threshold: alertForm.threshold || 0,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    setAlerts([...alerts, newAlert]);
    setAlertForm({ name: '', type: 'LOW_STOCK', threshold: undefined, isActive: true });
    setIsAlertModalOpen(false);
  };

  const handleAddClient = () => {
    const newClient: Client = {
      ...clientForm as Client,
      id: Math.random().toString(36).substr(2, 9),
      totalDebt: clientForm.totalDebt || 0,
      createdAt: new Date().toISOString()
    };
    setClients([...clients, newClient]);
    setClientForm({ name: '', phone: '', email: '', totalDebt: undefined });
    setIsClientModalOpen(false);
  };

  const handleAddClientTransaction = () => {
    if (!selectedClient) return;
    const newTransaction: ClientTransaction = {
      ...clientTransactionForm as ClientTransaction,
      amount: clientTransactionForm.amount || 0,
      id: Math.random().toString(36).substr(2, 9),
      clientId: selectedClient.id
    };
    
    setClientTransactions([...clientTransactions, newTransaction]);
    
    // Update client debt
    const debtChange = newTransaction.type === 'CREDIT' ? newTransaction.amount : -newTransaction.amount;
    setClients(clients.map(c => 
      c.id === selectedClient.id 
        ? { ...c, totalDebt: c.totalDebt + debtChange }
        : c
    ));

    // Update product stock if linked
    if (newTransaction.type === 'CREDIT' && newTransaction.productId && newTransaction.quantity) {
      setProducts(products.map(p => 
        p.id === newTransaction.productId 
          ? { ...p, stockQuantity: p.stockQuantity - (newTransaction.quantity || 0) }
          : p
      ));
    }
    
    setClientTransactionForm({
      date: format(new Date(), 'yyyy-MM-dd'), type: 'CREDIT', amount: undefined, description: '', clientId: '', quantity: undefined
    });
    setIsClientTransactionModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-lethal-black text-zinc-100 p-6 md:p-12 max-w-2xl mx-auto pb-32">
      {/* Header */}
      <header className="mb-12">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-6xl lethal-title font-bold">Lethal<br />Finance</h1>
          <div className="flex gap-4">
            <div className="flex bg-zinc-900 rounded-full p-1 border border-zinc-800">
              <button 
                onClick={() => setUserRole('executive')}
                className={cn(
                  "px-3 py-1 rounded-full text-[8px] lethal-mono transition-all",
                  userRole === 'executive' ? "bg-lethal-orange text-black font-bold" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                EXEC
              </button>
              <button 
                onClick={() => setUserRole('employee')}
                className={cn(
                  "px-3 py-1 rounded-full text-[8px] lethal-mono transition-all",
                  userRole === 'employee' ? "bg-zinc-700 text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                STAFF
              </button>
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
            <button className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-lethal-orange hover:border-lethal-orange transition-all">
              <LogOut size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-lethal-gray rounded-2xl p-1 flex mb-12 border border-zinc-800/50">
        {[
          { id: 'portfolio', label: 'PORTFOLIO' },
          { id: 'store', label: 'STORE' },
          { id: 'clients', label: 'CLIENTS' },
          { id: 'calendar', label: 'CALENDAR' },
          { id: 'alerts', label: 'ALERTS' },
        ].filter(tab => userRole === 'executive' || (tab.id !== 'alerts' && tab.id !== 'clients')).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={cn(
              "flex-1 py-3 rounded-xl text-xs font-bold lethal-mono transition-all duration-300",
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
              <h2 className="text-2xl font-bold lethal-title">Portfolio Overview</h2>
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none">
                  <select 
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value as any)}
                    className="w-full bg-lethal-gray border border-zinc-800 rounded-2xl px-4 py-2 text-[10px] lethal-mono font-bold text-zinc-400 focus:text-white focus:border-lethal-orange outline-none appearance-none cursor-pointer transition-all uppercase"
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
            <div className="grid grid-cols-2 gap-4">
              <StatCard 
                label="Revenue" 
                value={formatCurrency(stats.current.revenue)} 
                trend={stats.trends.revenue}
              />
              <StatCard 
                label="Expenses" 
                value={formatCurrency(stats.current.totalExpenses)} 
                trend={stats.trends.expenses}
                inverse
              />
              {userRole === 'executive' && (
                <>
                  <StatCard 
                    label="Gross Profit" 
                    value={formatCurrency(stats.current.grossProfit)} 
                    trend={stats.trends.grossProfit}
                  />
                  <StatCard 
                    label="Net Profit" 
                    value={formatCurrency(stats.current.netProfit)} 
                    trend={stats.trends.netProfit}
                    highlight={stats.current.netProfit >= 0 ? "emerald" : "rose"}
                  />
                  <div className="col-span-2 bg-lethal-gray p-6 rounded-3xl border border-zinc-800 flex justify-between items-center">
                    <div>
                      <p className="lethal-mono text-[10px] text-zinc-500 mb-1 uppercase">Profit Margin</p>
                      <p className="text-3xl font-bold text-white">{stats.current.margin.toFixed(1)}%</p>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 lethal-mono text-[10px] font-bold px-3 py-1 rounded-full",
                      stats.trends.margin >= 0 ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
                    )}>
                      {stats.trends.margin >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {Math.abs(stats.trends.margin).toFixed(1)}%
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Weekly Performance Chart */}
            <div className="bg-lethal-gray border border-zinc-800 p-6 rounded-3xl space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="lethal-mono text-xs font-bold text-lethal-orange tracking-widest uppercase">Weekly Performance</h3>
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
                                {item.discount > 0 && <span className="ml-2 text-rose-500/80">• DISC: {formatCurrency(item.discount)}</span>}
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
                        {isSale ? formatCurrency(item.quantity * item.sellingPrice - item.discount) : 
                         isRestock ? `+${item.quantity}` : 
                         formatCurrency((item as Expense).amount)}
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
                    .filter(p => p.name.toLowerCase().includes(productsSearch.toLowerCase()) || p.sku.toLowerCase().includes(productsSearch.toLowerCase()))
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
                            <p className="lethal-mono text-[10px] text-zinc-500">{product.sku} • {product.stockQuantity} {product.unit} REMAINING</p>
                            {userRole === 'executive' && (
                              <p className="lethal-mono text-[9px] text-emerald-500 mt-2">TOTAL PROFIT: {formatCurrency(totalProfit)}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {userRole === 'executive' && (
                                <span className="text-[10px] lethal-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                                  {calculateMargin(product.buyingPrice, product.sellingPrice).toFixed(1)}%
                                </span>
                              )}
                              <p className="text-lethal-orange font-bold">{formatCurrency(product.sellingPrice)}</p>
                            </div>
                            <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); setEditingProduct(product); setProductForm(product); setIsProductModalOpen(true); }} className="text-zinc-500 hover:text-white"><Edit3 size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); setProducts(products.filter(p => p.id !== product.id)); }} className="text-zinc-500 hover:text-rose-500"><Trash2 size={14} /></button>
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
                      <div className="flex justify-between items-end">
                        <div>
                          <h2 className="text-4xl font-bold lethal-title mb-2">{product.name}</h2>
                          <p className="lethal-mono text-xs text-zinc-500">{product.sku} • {product.category}</p>
                        </div>
                        {userRole === 'executive' && (
                          <div className="text-right">
                            <p className="lethal-mono text-[10px] text-zinc-500 mb-1 uppercase">Total Profit</p>
                            <p className="text-3xl font-bold text-emerald-500">{formatCurrency(totalProfit)}</p>
                          </div>
                        )}
                      </div>

                      <div className={cn("grid gap-4", userRole === 'executive' ? "grid-cols-3" : "grid-cols-2")}>
                        <div className="bg-lethal-gray p-6 rounded-3xl border border-zinc-800">
                          <p className="lethal-mono text-[10px] text-zinc-500 mb-2 uppercase">Stock</p>
                          <p className="text-xl font-bold text-white">{product.stockQuantity} {product.unit}</p>
                        </div>
                        {userRole === 'executive' && (
                          <div className="bg-lethal-gray p-6 rounded-3xl border border-zinc-800">
                            <p className="lethal-mono text-[10px] text-zinc-500 mb-2 uppercase">Buying Price</p>
                            <p className="text-xl font-bold text-white">{formatCurrency(product.buyingPrice)}</p>
                          </div>
                        )}
                        <div className="bg-lethal-gray p-6 rounded-3xl border border-zinc-800">
                          <p className="lethal-mono text-[10px] text-zinc-500 mb-2 uppercase">Selling Price</p>
                          <p className="text-xl font-bold text-lethal-orange">{formatCurrency(product.sellingPrice)}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="lethal-mono text-xs font-bold text-zinc-500 uppercase tracking-widest">Sales History</h3>
                        {productSales.length > 0 ? (
                          <div className="space-y-2">
                            {productSales
                              .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
                              .map((sale) => {
                                const profit = (sale.quantity * sale.sellingPrice) - sale.discount - (sale.quantity * product.buyingPrice);
                                return (
                                  <div key={sale.id} className="bg-lethal-gray/50 border border-zinc-800/50 p-4 rounded-2xl flex justify-between items-center">
                                    <div>
                                      <p className="text-sm font-bold text-white">QTY: {sale.quantity}</p>
                                      <p className="lethal-mono text-[9px] text-zinc-500">{format(parseISO(sale.date), 'MMM dd, yyyy')}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-bold text-lethal-orange">{formatCurrency((sale.quantity * sale.sellingPrice) - sale.discount)}</p>
                                      {userRole === 'executive' && (
                                        <p className="lethal-mono text-[9px] text-emerald-500">PROFIT: {formatCurrency(profit)}</p>
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
                                {formatCurrency(stats.revenue)}
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
                      <p className="text-sm font-bold text-white">{formatCurrency(getDayStats(selectedDate).revenue)}</p>
                    </div>
                    {userRole === 'executive' && (
                      <div className="text-right">
                        <p className="text-[8px] lethal-mono text-zinc-500 uppercase">Net Profit</p>
                        <p className={cn(
                          "text-sm font-bold",
                          getDayStats(selectedDate).netProfit >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {formatCurrency(getDayStats(selectedDate).netProfit)}
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
                                <p className="text-[8px] lethal-mono text-zinc-600">QTY: {sale.quantity} • {sale.paymentMethod?.toUpperCase()} • {formatCurrency(sale.sellingPrice)}/ea</p>
                              </div>
                              <p className="text-xs font-bold text-lethal-orange">{formatCurrency(sale.quantity * sale.sellingPrice - sale.discount)}</p>
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
                            <p className="text-xs font-bold text-zinc-400">{formatCurrency(expense.amount)}</p>
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
                                <p className="text-xs font-bold text-zinc-400">{formatCurrency(restock.quantity * restock.unitCost)}</p>
                                <p className="text-[8px] lethal-mono text-zinc-600 uppercase">COST: {formatCurrency(restock.unitCost)}/ea</p>
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

        {activeTab === 'clients' && userRole === 'executive' && (
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
                onClick={() => setIsClientModalOpen(true)}
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
                          {formatCurrency(client.totalDebt)}
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
                        onClick={() => setClients(clients.filter(c => c.id !== client.id))}
                        className="w-12 bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-500 text-zinc-500 rounded-xl flex items-center justify-center transition-all"
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
                                {t.type === 'CREDIT' ? '+' : '-'}{formatCurrency(t.amount)}
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
                            {rule.type.replace('_', ' ')} • THRESHOLD: {rule.type === 'SALES_TARGET' ? formatCurrency(rule.threshold) : rule.threshold}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setAlerts(alerts.map(a => a.id === rule.id ? { ...a, isActive: !a.isActive } : a))}
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
                        <button onClick={() => setAlerts(alerts.filter(a => a.id !== rule.id))} className="text-zinc-700 hover:text-rose-500 transition-colors">
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
      </AnimatePresence>

      {/* FAB */}
      <button className="fixed bottom-8 right-8 w-16 h-16 rounded-full lethal-pill-active flex items-center justify-center shadow-2xl z-40 hover:scale-110 transition-transform">
        <MessageCircle size={28} />
      </button>

      {/* Modals (Simplified for token limit, but functional) */}
      <AnimatePresence>
        {(isProductModalOpen || isSaleModalOpen || isExpenseModalOpen || isRestockModalOpen || isAlertModalOpen || isClientModalOpen || isClientTransactionModalOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsProductModalOpen(false); setIsSaleModalOpen(false); setIsExpenseModalOpen(false); setIsRestockModalOpen(false); setIsAlertModalOpen(false); setIsClientModalOpen(false); setIsClientTransactionModalOpen(false); setModalSearch(''); }} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-lethal-gray border border-zinc-800 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold lethal-title">
                  {isProductModalOpen ? (editingProduct ? 'EDIT STOCK' : 'NEW STOCK') : isSaleModalOpen ? 'ADD SALE' : isExpenseModalOpen ? 'ADD EXPENSE' : isRestockModalOpen ? 'RESTOCK STOCK' : isAlertModalOpen ? 'NEW ALERT' : isClientModalOpen ? 'NEW CLIENT' : 'ADJUST DEBT'}
                </h3>
                <button onClick={() => { setIsProductModalOpen(false); setIsSaleModalOpen(false); setIsExpenseModalOpen(false); setIsRestockModalOpen(false); setIsAlertModalOpen(false); setIsClientModalOpen(false); setIsClientTransactionModalOpen(false); setModalSearch(''); }} className="text-zinc-500 hover:text-white"><X size={24} /></button>
              </div>
              
              <div className="space-y-6">
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
                    <button onClick={handleAddAlert} className="w-full lethal-pill-active py-5 rounded-2xl font-bold lethal-mono text-sm tracking-widest">INITIALIZE SURVEILLANCE</button>
                  </>
                )}

                {isClientModalOpen && (
                  <>
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
                    <button onClick={handleAddClient} className="w-full lethal-pill-active py-5 rounded-2xl font-bold lethal-mono text-sm tracking-widest">REGISTER CLIENT</button>
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
                    <button onClick={handleAddClientTransaction} className="w-full lethal-pill-active py-5 rounded-2xl font-bold lethal-mono text-sm tracking-widest uppercase">
                      {clientTransactionForm.type === 'CREDIT' ? 'Record Credit' : 'Record Payment'}
                    </button>
                  </>
                )}

                {isProductModalOpen && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] lethal-mono text-zinc-500 ml-2">STOCK NAME</label>
                      <input type="text" placeholder="STOCK NAME" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] lethal-mono text-zinc-500 ml-2">SKU</label>
                        <input type="text" placeholder="SKU" value={productForm.sku} onChange={e => setProductForm({ ...productForm, sku: e.target.value })} className="w-full bg-lethal-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-lethal-orange outline-none" />
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
                    <button onClick={handleAddProduct} className="w-full lethal-pill-active py-5 rounded-2xl font-bold lethal-mono text-sm tracking-widest">EXECUTE STOCK COMMAND</button>
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
                          .filter(p => p.name.toLowerCase().includes(modalSearch.toLowerCase()) || p.sku.toLowerCase().includes(modalSearch.toLowerCase()))
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
                        {products.filter(p => p.name.toLowerCase().includes(modalSearch.toLowerCase()) || p.sku.toLowerCase().includes(modalSearch.toLowerCase())).length === 0 && (
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
                    <button onClick={handleAddSale} className="w-full lethal-pill-active py-5 rounded-2xl font-bold lethal-mono text-sm tracking-widest">ADD TRANSACTION</button>
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
                          .filter(p => p.name.toLowerCase().includes(modalSearch.toLowerCase()) || p.sku.toLowerCase().includes(modalSearch.toLowerCase()))
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
                    <button onClick={handleAddRestock} className="w-full bg-emerald-500 text-black py-5 rounded-2xl font-bold lethal-mono text-sm tracking-widest hover:bg-emerald-400 transition-all">EXECUTE RESTOCK</button>
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
                    <button onClick={handleAddExpense} className="w-full lethal-pill-active py-5 rounded-2xl font-bold lethal-mono text-sm tracking-widest">ADD EXPENDITURE</button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
