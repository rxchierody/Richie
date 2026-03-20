import React from 'react';
import { motion } from 'motion/react';
import { ChevronDown, TrendingUp, ShoppingCart, DollarSign, Package } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { StatCard } from './StatCard';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface PortfolioProps {
  timePeriod: 'daily' | 'weekly' | 'monthly' | 'yearly';
  setTimePeriod: (period: 'daily' | 'weekly' | 'monthly' | 'yearly') => void;
  paymentMethodFilter: string;
  setPaymentMethodFilter: (method: string) => void;
  stats: any;
  chartData: any[];
  categoryData: any[];
  userRole: string;
  f: (amount: number) => string;
}

const Portfolio: React.FC<PortfolioProps> = ({
  timePeriod,
  setTimePeriod,
  paymentMethodFilter,
  setPaymentMethodFilter,
  stats,
  chartData,
  categoryData,
  userRole,
  f
}) => {
  return (
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <div className="bg-rowina-gray p-5 sm:p-6 rounded-[32px] border border-zinc-800 relative min-h-[110px] flex flex-col justify-between">
              <p className="rowina-mono text-[10px] text-zinc-500 uppercase tracking-widest">Profit Margin</p>
              <div className="mt-2">
                <p className="text-3xl sm:text-4xl font-bold tracking-tight text-white">{stats.current.margin.toFixed(1)}%</p>
              </div>
              <div className={cn(
                "absolute bottom-5 right-6 flex items-center gap-1 rowina-mono text-[10px] font-bold",
                stats.trends.margin >= 0 ? "text-emerald-500" : "text-rose-500"
              )}>
                {stats.trends.margin >= 0 ? <TrendingUp size={12} className="rotate-0" /> : <TrendingUp size={12} className="rotate-180" />}
                {Math.abs(stats.trends.margin).toFixed(1)}%
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Chart */}
      <div className="bg-rowina-gray border border-zinc-800 p-6 sm:p-8 rounded-[40px] space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="rowina-mono text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Performance Matrix</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rowina-blue" />
              <span className="text-[8px] rowina-mono text-zinc-500">SALES</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-[8px] rowina-mono text-zinc-500">EXPENSES</span>
            </div>
          </div>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0A84FF" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0A84FF" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#525252" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(str) => {
                  try {
                    return format(new Date(str), timePeriod === 'daily' ? 'HH:mm' : 'MMM dd');
                  } catch {
                    return str;
                  }
                }}
              />
              <YAxis 
                stroke="#525252" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val) => f(val).replace(/[^\d.kM]/g, '')}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '16px', fontSize: '10px', fontFamily: 'JetBrains Mono' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="sales" stroke="#0A84FF" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              <Area type="monotone" dataKey="expenses" stroke="#F43F5E" strokeWidth={3} fillOpacity={1} fill="url(#colorExpenses)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown */}
      {userRole === 'executive' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-rowina-gray border border-zinc-800 p-8 rounded-[40px] space-y-6">
            <h3 className="rowina-mono text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Sales by Category</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#525252" fontSize={10} width={80} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', fontSize: '10px' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#0A84FF', '#34D399', '#F43F5E', '#FBBF24', '#818CF8'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-rowina-gray border border-zinc-800 p-8 rounded-[40px] space-y-6">
            <h3 className="rowina-mono text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Operational Insights</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                    <ShoppingCart size={16} />
                  </div>
                  <span className="text-xs font-bold text-white">Avg. Transaction</span>
                </div>
                <span className="text-sm font-bold text-emerald-500">{f(stats.current.revenue / (stats.current.salesCount || 1))}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rowina-blue/10 text-rowina-blue rounded-lg">
                    <Package size={16} />
                  </div>
                  <span className="text-xs font-bold text-white">Inventory Value</span>
                </div>
                <span className="text-sm font-bold text-rowina-blue">{f(stats.current.inventoryValue)}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg">
                    <DollarSign size={16} />
                  </div>
                  <span className="text-xs font-bold text-white">Burn Rate</span>
                </div>
                <span className="text-sm font-bold text-rose-500">{f(stats.current.totalExpenses / (timePeriod === 'daily' ? 1 : timePeriod === 'weekly' ? 7 : 30))} / day</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Portfolio;
