import React from 'react';
import { motion } from 'motion/react';
import { Plus, Search, Users, CreditCard, Edit2, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import { Client, ClientTransaction } from '../types';

interface ClientsProps {
  clients: Client[];
  clientTransactions: ClientTransaction[];
  clientsSearch: string;
  setClientsSearch: (search: string) => void;
  f: (amount: number) => string;
  requireAuth: (callback: () => void) => void;
  setIsClientModalOpen: (open: boolean) => void;
  setIsClientTransactionModalOpen: (open: boolean) => void;
  setEditingClient: (client: Client | null) => void;
  setClientForm: (form: any) => void;
  setSelectedClient: (client: Client | null) => void;
  handleDeleteClient: (id: string) => void;
}

const Clients: React.FC<ClientsProps> = ({
  clients,
  clientTransactions,
  clientsSearch,
  setClientsSearch,
  f,
  requireAuth,
  setIsClientModalOpen,
  setIsClientTransactionModalOpen,
  setEditingClient,
  setClientForm,
  setSelectedClient,
  handleDeleteClient
}) => {
  return (
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
                <p className="rowina-mono text-[8px] text-zinc-600 uppercase mb-3 tracking-widest">Recent Ledger Entries</p>
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
  );
};

export default Clients;
