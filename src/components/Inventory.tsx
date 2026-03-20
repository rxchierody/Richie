import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Search, Edit3, Trash2, Package, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useApp } from '../AppContext';
import { cn } from '../lib/utils';
import { Product } from '../types';

export const Inventory: React.FC = () => {
  const {
    products,
    sales,
    userRole,
    f,
    requireAuth,
    setIsProductModalOpen,
    setEditingProduct,
    setProductForm,
    handleDeleteProduct,
    setRestockForm,
    setIsRestockModalOpen,
    setModalSearch
  } = useApp();

  const [productsSearch, setProductsSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const calculateMargin = (buying: number, selling: number) => {
    if (buying === 0) return 0;
    return ((selling - buying) / buying) * 100;
  };

  const round = (num: number) => Math.round(num * 100) / 100;

  if (selectedProductId) {
    const product = products.find(p => p.id === selectedProductId);
    if (!product) {
      setSelectedProductId(null);
      return null;
    }

    const productSales = sales.filter(s => s.productId === product.id);
    const totalProfit = productSales.reduce((acc, sale) => {
      const revenue = (sale.quantity * sale.sellingPrice) - sale.discount;
      const cost = sale.quantity * (sale.buyingPrice ?? product.buyingPrice);
      return acc + (revenue - cost);
    }, 0);

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-8"
      >
        <div className="flex justify-between items-center">
          <button 
            onClick={() => setSelectedProductId(null)}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors rowina-mono text-[10px] font-bold"
          >
            <ArrowLeft size={16} /> BACK TO STORE
          </button>
          <button 
            onClick={() => requireAuth(() => {
              setRestockForm({ date: format(new Date(), 'yyyy-MM-dd'), productId: product.id, unitCost: product.buyingPrice });
              setModalSearch('');
              setIsRestockModalOpen(true);
            })}
            className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 transition-colors rowina-mono text-[10px] font-bold border border-emerald-500/30 px-4 py-2 rounded-full"
          >
            <Package size={14} /> RESTOCK UNIT
          </button>
        </div>

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
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((sale) => {
                  const buyingPrice = sale.buyingPrice ?? product.buyingPrice;
                  const profit = round((sale.quantity * sale.sellingPrice) - sale.discount - (sale.quantity * buyingPrice));
                  return (
                    <div key={sale.id} className="bg-rowina-gray/50 border border-zinc-800/50 p-4 rounded-2xl flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-white">QTY: {sale.quantity}</p>
                        <p className="rowina-mono text-[9px] text-zinc-500">{format(new Date(sale.date), 'MMM dd, yyyy')}</p>
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
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold rowina-title">Stock Store</h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => requireAuth(() => {
              setRestockForm({ date: format(new Date(), 'yyyy-MM-dd'), productId: '', quantity: undefined, unitCost: undefined });
              setModalSearch('');
              setIsRestockModalOpen(true);
            })}
            className="text-[10px] rowina-mono text-emerald-500 border border-emerald-500/30 px-4 py-2 rounded-full hover:bg-emerald-500/10 transition-all flex items-center gap-2"
          >
            <Package size={14} /> RESTOCK
          </button>
          <button 
            onClick={() => requireAuth(() => {
              setEditingProduct(null);
              setProductForm({ name: '', category: 'General', unit: 'pcs', stockQuantity: undefined, buyingPrice: undefined, sellingPrice: undefined });
              setIsProductModalOpen(true);
            })}
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

      <div className="space-y-4">
        {products
          .filter(p => p.name.toLowerCase().includes(productsSearch.toLowerCase()))
          .map(product => {
            const productSales = sales.filter(s => s.productId === product.id);
            const totalProfit = productSales.reduce((acc, sale) => {
              const revenue = (sale.quantity * sale.sellingPrice) - sale.discount;
              const cost = sale.quantity * (sale.buyingPrice ?? product.buyingPrice);
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
    </motion.div>
  );
};
