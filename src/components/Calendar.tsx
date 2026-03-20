import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, subMonths, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import { Product, Sale, Expense, Restock, UserRole } from '../types';

interface CalendarProps {
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  getDayStats: (day: Date) => { revenue: number; netProfit: number; restockCost: number };
  sales: Sale[];
  expenses: Expense[];
  restocks: Restock[];
  products: Product[];
  userRole: UserRole;
  f: (amount: number) => string;
}

const Calendar: React.FC<CalendarProps> = ({
  currentMonth,
  setCurrentMonth,
  selectedDate,
  setSelectedDate,
  getDayStats,
  sales,
  expenses,
  restocks,
  products,
  userRole,
  f
}) => {
  return (
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
                          <p className="text-[8px] rowina-mono text-zinc-600">QTY: {restock.quantity} • {f(restock.unitCost)}/ea</p>
                        </div>
                        <p className="text-xs font-bold text-emerald-500">{f(restock.quantity * restock.unitCost)}</p>
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
  );
};

export default Calendar;
