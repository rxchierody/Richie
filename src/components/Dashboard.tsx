import React, { Suspense, lazy } from 'react';
import { ShoppingCart, Package, ReceiptIndianRupee, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useApp } from '../AppContext';
import { cn, f } from '../lib/utils';
import { Sale, Restock, Expense } from '../types';

const BarChart = lazy(() => import('recharts').then(module => ({ default: module.BarChart })));
const Bar = lazy(() => import('recharts').then(module => ({ default: module.Bar })));
const XAxis = lazy(() => import('recharts').then(module => ({ default: module.XAxis })));
const YAxis = lazy(() => import('recharts').then(module => ({ default: module.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then(module => ({ default: module.CartesianGrid })));
const Tooltip = lazy(() => import('recharts').then(module => ({ default: module.Tooltip })));
const ResponsiveContainer = lazy(() => import('recharts').then(module => ({ default: module.ResponsiveContainer })));

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <div className="bg-rowina-gray p-6 rounded-[32px] border border-zinc-800/50 hover:border-zinc-700 transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-3 rounded-2xl", color)}>
        <Icon size={20} />
      </div>
      {trend && (
        <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-[8px] rowina-mono", trend > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
          {trend > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
    <p className="rowina-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{title}</p>
    <h3 className="text-2xl font-bold text-white group-hover:scale-105 transition-transform origin-left">{value}</h3>
  </div>
);

export default function Dashboard({ setIsSaleModalOpen, setIsExpenseModalOpen }: any) {
  const { stats, chartData, recentLogs, products, requireAuth } = useApp();

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Revenue" 
          value={f(stats.revenue)} 
          icon={TrendingUp} 
          color="bg-rowina-blue/10 text-rowina-blue"
        />
        <StatCard 
          title="Net Profit" 
          value={f(stats.netProfit)} 
          icon={DollarSign} 
          color="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard 
          title="Expenses" 
          value={f(stats.expenseTotal)} 
          icon={ReceiptIndianRupee} 
          color="bg-rose-500/10 text-rose-500"
        />
        <StatCard 
          title="Restock Cost" 
          value={f(stats.restockCost)} 
          icon={Package} 
          color="bg-amber-500/10 text-amber-500"
        />
      </div>

      <div className="bg-rowina-gray p-8 rounded-[40px] border border-zinc-800/50">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="rowina-mono text-xs font-bold text-zinc-500">PERFORMANCE</h3>
            <p className="text-white font-bold">Revenue vs Expenses</p>
          </div>
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
          <Suspense fallback={<div className="w-full h-full bg-white/5 animate-pulse rounded-xl" />}>
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
          </Suspense>
        </div>
      </div>

      <div className="space-y-4 mt-8">
        <div className="flex justify-between items-center">
          <h3 className="rowina-mono text-xs font-bold text-zinc-500">RECENT LOGS</h3>
          <div className="flex gap-2">
            <button onClick={() => requireAuth(() => setIsSaleModalOpen(true))} className="text-[10px] rowina-mono text-rowina-blue border border-rowina-blue/30 px-3 py-1 rounded-full hover:bg-rowina-blue/10 transition-all">ADD SALE</button>
            <button onClick={() => requireAuth(() => setIsExpenseModalOpen(true))} className="text-[10px] rowina-mono text-zinc-500 border border-zinc-800 px-3 py-1 rounded-full hover:bg-white/5 transition-all">ADD EXPENSE</button>
          </div>
        </div>
        
        {recentLogs.map((item: any, i: number) => {
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
                <div className="text-right">
                  <p className={cn(
                    "text-sm font-bold",
                    isSale ? "text-white" : 
                    isRestock ? "text-emerald-500" : 
                    "text-rose-500"
                  )}>
                    {isSale ? f((item as Sale).quantity * (item as Sale).sellingPrice - (item as Sale).discount) : 
                     isRestock ? f((item as Restock).quantity * (item as Restock).unitCost) : 
                     f((item as Expense).amount)}
                  </p>
                  <p className="rowina-mono text-[8px] text-zinc-600 uppercase">
                    {isSale ? 'REVENUE' : isRestock ? 'RESTOCK' : 'EXPENSE'}
                  </p>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
