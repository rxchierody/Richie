import React from 'react';
import { motion } from 'motion/react';
import { Download, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  reportDate: string;
  setReportDate: (date: string) => void;
  sales: any[];
  expenses: any[];
  restocks: any[];
  products: any[];
  userRole: string;
  f: (amount: number) => string;
  requireAuth: (callback: () => void) => void;
}

const Reports: React.FC<ReportsProps> = ({
  reportDate,
  setReportDate,
  sales,
  expenses,
  restocks,
  products,
  userRole,
  f,
  requireAuth
}) => {
  const round = (num: number) => Math.round(num * 100) / 100;

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
    </motion.div>
  );
};

export default Reports;
