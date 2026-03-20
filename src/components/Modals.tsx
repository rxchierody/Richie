import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search } from 'lucide-react';
import { useApp } from '../AppContext';
import { cn } from '../lib/utils';
import { PaymentMethod, ExpenseCategory } from '../types';

export const Modals: React.FC = () => {
  const {
    isProductModalOpen, setIsProductModalOpen,
    isSaleModalOpen, setIsSaleModalOpen,
    isExpenseModalOpen, setIsExpenseModalOpen,
    isRestockModalOpen, setIsRestockModalOpen,
    isAlertModalOpen, setIsAlertModalOpen,
    isClientModalOpen, setIsClientModalOpen,
    isClientTransactionModalOpen, setIsClientTransactionModalOpen,
    isStaffModalOpen, setIsStaffModalOpen,
    isStoreModalOpen, setIsStoreModalOpen,
    productForm, setProductForm,
    saleForm, setSaleForm,
    expenseForm, setExpenseForm,
    restockForm, setRestockForm,
    clientForm, setClientForm,
    clientTransactionForm, setClientTransactionForm,
    alertForm, setAlertForm,
    staffForm, setStaffForm,
    storeForm, setStoreForm,
    handleAddProduct, handleAddSale, handleAddExpense, handleAddRestock, handleAddClient, handleAddClientTransaction, handleAddAlert, handleAddStaff, handleAddStore,
    isSubmitting,
    modalSearch, setModalSearch,
    products,
    stores,
    userRole,
    editingProduct, editingClient, editingStaff, editingStore
  } = useApp();

  const closeModal = () => {
    setIsProductModalOpen(false);
    setIsSaleModalOpen(false);
    setIsExpenseModalOpen(false);
    setIsRestockModalOpen(false);
    setIsAlertModalOpen(false);
    setIsClientModalOpen(false);
    setIsClientTransactionModalOpen(false);
    setIsStaffModalOpen(false);
    setIsStoreModalOpen(false);
  };

  const isOpen = isProductModalOpen || isSaleModalOpen || isExpenseModalOpen || isRestockModalOpen || isAlertModalOpen || isClientModalOpen || isClientTransactionModalOpen || isStaffModalOpen || isStoreModalOpen;

  if (!isOpen) return null;

  const getTitle = () => {
    if (isProductModalOpen) return editingProduct ? 'Edit Product' : 'New Product';
    if (isSaleModalOpen) return 'New Sale';
    if (isExpenseModalOpen) return 'New Expense';
    if (isRestockModalOpen) return 'Restock Inventory';
    if (isAlertModalOpen) return 'Alert Rule';
    if (isClientModalOpen) return editingClient ? 'Edit Client' : 'New Client';
    if (isClientTransactionModalOpen) return clientTransactionForm.type === 'CREDIT' ? 'Record Credit' : 'Record Payment';
    if (isStaffModalOpen) return editingStaff ? 'Edit Staff' : 'New Staff';
    if (isStoreModalOpen) return editingStore ? 'Edit Store' : 'New Store';
    return '';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeModal}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-rowina-gray w-full max-w-lg rounded-[40px] border border-zinc-800 p-8 relative z-10 max-h-[90vh] overflow-y-auto no-scrollbar"
        >
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-white">{getTitle()}</h2>
            <button onClick={closeModal} className="p-2 hover:bg-white/5 rounded-full text-zinc-500 transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            {isProductModalOpen && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] rowina-mono text-zinc-500 ml-2">STOCK NAME</label>
                  <input type="text" placeholder="STOCK NAME" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none text-white" />
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
                    className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none text-white" 
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
                      className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none text-white" 
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
                      className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none text-white" 
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
                  {isSubmitting ? 'PROCESSING...' : 'EXECUTE STOCK COMMAND'}
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
                      className="w-full bg-rowina-black border border-zinc-800 rounded-2xl pl-10 pr-4 py-3 text-xs rowina-mono focus:border-rowina-blue outline-none mb-2 text-white"
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
                      className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none text-white" 
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
                      className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none text-white" 
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
                  {isSubmitting ? 'PROCESSING...' : 'ADD TRANSACTION'}
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
                      className="w-full bg-rowina-black border border-zinc-800 rounded-2xl pl-10 pr-4 py-3 text-xs rowina-mono focus:border-rowina-blue outline-none mb-2 text-white"
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
                      className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none text-white" 
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
                      className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none text-white" 
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
                  {isSubmitting ? 'PROCESSING...' : 'EXECUTE RESTOCK'}
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
                    className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none appearance-none text-white"
                  >
                    {['Rent', 'Utilities', 'Supplies', 'Wages', 'Other']
                      .map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)
                    }
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] rowina-mono text-zinc-500 ml-2">DESCRIPTION</label>
                  <input type="text" placeholder="DESCRIPTION" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none text-white" />
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
                    className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none text-white" 
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
                  {isSubmitting ? 'PROCESSING...' : 'ADD EXPENDITURE'}
                </button>
              </>
            )}

            {isClientModalOpen && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] rowina-mono text-zinc-500 ml-2">CLIENT NAME</label>
                  <input type="text" placeholder="CLIENT NAME" value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] rowina-mono text-zinc-500 ml-2">PHONE NUMBER</label>
                  <input type="text" placeholder="PHONE NUMBER" value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] rowina-mono text-zinc-500 ml-2">EMAIL ADDRESS</label>
                  <input type="email" placeholder="EMAIL ADDRESS" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none text-white" />
                </div>
                <button 
                  onClick={handleAddClient} 
                  disabled={isSubmitting}
                  className={cn(
                    "w-full py-5 rounded-2xl font-bold rowina-mono text-sm tracking-widest transition-all",
                    isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "rowina-pill-active"
                  )}
                >
                  {isSubmitting ? 'PROCESSING...' : (editingClient ? 'UPDATE CLIENT' : 'REGISTER CLIENT')}
                </button>
              </>
            )}

            {isClientTransactionModalOpen && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] rowina-mono text-zinc-500 ml-2">TRANSACTION TYPE</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setClientTransactionForm({ ...clientTransactionForm, type: 'CREDIT' })}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[10px] font-bold rowina-mono transition-all",
                        clientTransactionForm.type === 'CREDIT' ? "bg-rose-500 text-white" : "bg-zinc-800 text-zinc-500"
                      )}
                    >
                      INCREASE DEBT
                    </button>
                    <button 
                      onClick={() => setClientTransactionForm({ ...clientTransactionForm, type: 'PAYMENT' })}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[10px] font-bold rowina-mono transition-all",
                        clientTransactionForm.type === 'PAYMENT' ? "bg-emerald-500 text-white" : "bg-zinc-800 text-zinc-500"
                      )}
                    >
                      REDUCE DEBT
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] rowina-mono text-zinc-500 ml-2">AMOUNT</label>
                  <input 
                    type="number" 
                    placeholder="AMOUNT" 
                    value={clientTransactionForm.amount ?? ''} 
                    onChange={e => {
                      const val = e.target.value;
                      setClientTransactionForm({ ...clientTransactionForm, amount: val === '' ? undefined : Number(val) });
                    }} 
                    className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] rowina-mono text-zinc-500 ml-2">DESCRIPTION</label>
                  <input type="text" placeholder="e.g. 5kg Sugar, Partial Payment" value={clientTransactionForm.description} onChange={e => setClientTransactionForm({ ...clientTransactionForm, description: e.target.value })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none text-white" />
                </div>
                {clientTransactionForm.type === 'CREDIT' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">LINKED PRODUCT</label>
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
                        className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none appearance-none text-white"
                      >
                        <option value="">NO PRODUCT LINKED</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] rowina-mono text-zinc-500 ml-2">QUANTITY</label>
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
                        className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none text-white" 
                      />
                    </div>
                  </div>
                )}
                <button 
                  onClick={handleAddClientTransaction} 
                  disabled={isSubmitting}
                  className={cn(
                    "w-full py-5 rounded-2xl font-bold rowina-mono text-sm tracking-widest uppercase transition-all",
                    isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "rowina-pill-active"
                  )}
                >
                  {isSubmitting ? 'PROCESSING...' : (clientTransactionForm.type === 'CREDIT' ? 'Record Credit' : 'Record Payment')}
                </button>
              </>
            )}

            {isStaffModalOpen && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] rowina-mono text-zinc-500 ml-2">DISPLAY NAME</label>
                  <input type="text" placeholder="DISPLAY NAME" value={staffForm.displayName} onChange={e => setStaffForm({ ...staffForm, displayName: e.target.value })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] rowina-mono text-zinc-500 ml-2">EMAIL ADDRESS</label>
                  <input type="email" placeholder="EMAIL ADDRESS" value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] rowina-mono text-zinc-500 ml-2">ROLE</label>
                  <select 
                    value={staffForm.role} 
                    onChange={e => setStaffForm({ ...staffForm, role: e.target.value as any })} 
                    className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none appearance-none text-white"
                  >
                    <option value="employee">EMPLOYEE</option>
                    <option value="executive">EXECUTIVE</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] rowina-mono text-zinc-500 ml-2">ASSIGNED STORES</label>
                  <div className="flex flex-wrap gap-2">
                    {stores.map(store => (
                      <button
                        key={store.id}
                        onClick={() => {
                          const ids = staffForm.assignedStoreIds || [];
                          const newIds = ids.includes(store.id) ? ids.filter(id => id !== store.id) : [...ids, store.id];
                          setStaffForm({ ...staffForm, assignedStoreIds: newIds });
                        }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] rowina-mono border transition-all",
                          staffForm.assignedStoreIds?.includes(store.id)
                            ? "bg-rowina-blue/20 border-rowina-blue text-rowina-blue"
                            : "bg-rowina-black border-zinc-800 text-zinc-500 hover:border-zinc-700"
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
                    "w-full py-5 rounded-2xl font-bold rowina-mono text-sm tracking-widest transition-all",
                    isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "rowina-pill-active"
                  )}
                >
                  {isSubmitting ? 'PROCESSING...' : (editingStaff ? 'UPDATE STAFF' : 'ADD STAFF')}
                </button>
              </>
            )}

            {isStoreModalOpen && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] rowina-mono text-zinc-500 ml-2">STORE NAME</label>
                  <input type="text" placeholder="STORE NAME" value={storeForm.name} onChange={e => setStoreForm({ ...storeForm, name: e.target.value })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] rowina-mono text-zinc-500 ml-2">LOCATION</label>
                  <input type="text" placeholder="LOCATION" value={storeForm.location} onChange={e => setStoreForm({ ...storeForm, location: e.target.value })} className="w-full bg-rowina-black border border-zinc-800 rounded-2xl px-6 py-4 text-sm focus:border-rowina-blue outline-none text-white" />
                </div>
                <button 
                  onClick={handleAddStore} 
                  disabled={isSubmitting}
                  className={cn(
                    "w-full py-5 rounded-2xl font-bold rowina-mono text-sm tracking-widest transition-all",
                    isSubmitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "rowina-pill-active"
                  )}
                >
                  {isSubmitting ? 'PROCESSING...' : (editingStore ? 'UPDATE STORE' : 'ADD STORE')}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
