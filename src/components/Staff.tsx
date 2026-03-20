import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Search, Edit3, Trash2, User, Shield, Briefcase } from 'lucide-react';
import { useApp } from '../AppContext';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';

export const Staff: React.FC = () => {
  const {
    staff,
    stores,
    userRole,
    requireAuth,
    setIsStaffModalOpen,
    setEditingStaff,
    setStaffForm,
    handleDeleteStaff
  } = useApp();

  const [staffSearch, setStaffSearch] = useState('');

  if (userRole !== 'executive') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
          <Shield size={32} />
        </div>
        <h2 className="text-xl font-bold rowina-title">Access Restricted</h2>
        <p className="rowina-mono text-xs text-zinc-500 max-w-xs">ONLY EXECUTIVE STAFF CAN MANAGE THE TEAM DIRECTORY.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold rowina-title">Team Directory</h2>
        <button 
          onClick={() => requireAuth(() => {
            setEditingStaff(null);
            setStaffForm({ email: '', role: 'employee', displayName: '', assignedStoreIds: [] });
            setIsStaffModalOpen(true);
          })}
          className="w-10 h-10 rounded-full rowina-pill-active flex items-center justify-center"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
        <input 
          type="text"
          placeholder="SEARCH STAFF..."
          value={staffSearch}
          onChange={(e) => setStaffSearch(e.target.value)}
          className="w-full bg-rowina-gray border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-xs rowina-mono focus:border-rowina-blue outline-none transition-all"
        />
      </div>

      <div className="space-y-4">
        {staff
          .filter(s => s.displayName?.toLowerCase().includes(staffSearch.toLowerCase()) || s.email.toLowerCase().includes(staffSearch.toLowerCase()))
          .map(member => (
            <div 
              key={member.id} 
              className="bg-rowina-gray border border-zinc-800 p-6 rounded-3xl flex justify-between items-center group hover:border-rowina-blue/50 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 overflow-hidden">
                  <User size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">{member.displayName || 'Unnamed Staff'}</h4>
                  <p className="rowina-mono text-[10px] text-zinc-500 uppercase">{member.email}</p>
                  <div className="flex gap-2 mt-2">
                    <span className={cn(
                      "text-[8px] rowina-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-widest",
                      member.role === 'executive' ? "bg-rowina-blue/10 text-rowina-blue" : "bg-zinc-800 text-zinc-500"
                    )}>
                      {member.role}
                    </span>
                    {member.assignedStoreIds?.map(storeId => {
                      const store = stores.find(s => s.id === storeId);
                      if (!store) return null;
                      return (
                        <span key={storeId} className="text-[8px] rowina-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1">
                          <Briefcase size={8} /> {store.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => requireAuth(() => { setEditingStaff(member as UserProfile); setStaffForm(member as any); setIsStaffModalOpen(true); })} className="text-zinc-500 hover:text-white"><Edit3 size={16} /></button>
                <button onClick={() => requireAuth(() => handleDeleteStaff(member.id))} className="text-zinc-500 hover:text-rose-500"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
      </div>
    </motion.div>
  );
};
