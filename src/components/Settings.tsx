import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Shield, 
  Lock, 
  Unlock, 
  Key, 
  Globe, 
  Briefcase, 
  Smartphone, 
  Download, 
  Share2, 
  LogOut, 
  User,
  Settings as SettingsIcon
} from 'lucide-react';
import { useApp } from '../AppContext';
import { cn } from '../lib/utils';
import { Store } from '../types';

export const Settings: React.FC = () => {
  const {
    user,
    userProfile,
    userRole,
    stores,
    currencyCode,
    setCurrencyCode,
    appLockConfig,
    setAppLockConfig,
    setIsAppLocked,
    executivePassword,
    handleUpdateExecutivePassword,
    requireAuth,
    setIsStoreModalOpen,
    setEditingStore,
    setStoreForm,
    handleDeleteStore,
    handleLogout,
    showInstallButton,
    handleInstallClick,
    isIOS,
    isStandalone
  } = useApp();

  const [settingsTab, setSettingsTab] = useState<'profile' | 'stores' | 'security' | 'system'>('profile');
  const [newExecPassword, setNewExecPassword] = useState('');
  const [isUpdatingExecPassword, setIsUpdatingExecPassword] = useState(false);

  const handleUpdatePassword = async () => {
    if (!newExecPassword) return;
    setIsUpdatingExecPassword(true);
    await handleUpdateExecutivePassword(newExecPassword);
    setNewExecPassword('');
    setIsUpdatingExecPassword(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold rowina-title">Control Center</h2>
        <button onClick={handleLogout} className="p-3 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all">
          <LogOut size={20} />
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'profile', label: 'PROFILE', icon: User },
          { id: 'stores', label: 'STORES', icon: Briefcase },
          { id: 'security', label: 'SECURITY', icon: Shield },
          { id: 'system', label: 'SYSTEM', icon: SettingsIcon }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSettingsTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full rowina-mono text-[10px] font-bold transition-all whitespace-nowrap",
              settingsTab === tab.id ? "rowina-pill-active" : "text-zinc-500 hover:bg-white/5"
            )}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {settingsTab === 'profile' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-rowina-gray border border-zinc-800 p-8 rounded-3xl flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
              <User size={40} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{userProfile?.displayName || 'Unnamed Staff'}</h3>
              <p className="rowina-mono text-[10px] text-zinc-500 uppercase">{user?.email}</p>
              <div className="flex gap-2 mt-4 justify-center">
                <span className={cn(
                  "text-[8px] rowina-mono px-3 py-1 rounded-full font-bold uppercase tracking-widest",
                  userRole === 'executive' ? "bg-rowina-blue/10 text-rowina-blue" : "bg-zinc-800 text-zinc-500"
                )}>
                  {userRole}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {settingsTab === 'stores' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="rowina-mono text-xs font-bold text-zinc-500 uppercase tracking-widest">Store Locations</h3>
            {userRole === 'executive' && (
              <button 
                onClick={() => requireAuth(() => {
                  setEditingStore(null);
                  setStoreForm({ name: '', location: '' });
                  setIsStoreModalOpen(true);
                })}
                className="text-[10px] rowina-mono text-rowina-blue border border-rowina-blue/30 px-4 py-2 rounded-full hover:bg-rowina-blue/10 transition-all flex items-center gap-2"
              >
                <Plus size={14} /> ADD STORE
              </button>
            )}
          </div>
          <div className="space-y-4">
            {stores.map(store => (
              <div key={store.id} className="bg-rowina-gray border border-zinc-800 p-6 rounded-3xl flex justify-between items-center group hover:border-rowina-blue/50 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-zinc-800 text-zinc-500">
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">{store.name}</h4>
                    <p className="rowina-mono text-[10px] text-zinc-500 uppercase">{store.location || 'NO LOCATION SET'}</p>
                  </div>
                </div>
                {userRole === 'executive' && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => requireAuth(() => { setEditingStore(store); setStoreForm(store); setIsStoreModalOpen(true); })} className="text-zinc-500 hover:text-white"><Edit3 size={16} /></button>
                    <button onClick={() => requireAuth(() => handleDeleteStore(store.id))} className="text-zinc-500 hover:text-rose-500"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {settingsTab === 'security' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-rowina-gray border border-zinc-800 p-6 rounded-3xl space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-rowina-blue/10 text-rowina-blue">
                  <Lock size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">App Lock</h4>
                  <p className="rowina-mono text-[10px] text-zinc-500">REQUIRE PIN ON STARTUP</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (appLockConfig.type) {
                    setAppLockConfig({ type: null, value: null });
                    setIsAppLocked(false);
                  } else {
                    setAppLockConfig({ type: 'pin', value: '1234' });
                  }
                }}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  appLockConfig.type ? "bg-rowina-blue" : "bg-zinc-800"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                  appLockConfig.type ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            {appLockConfig.type && (
              <div className="pt-6 border-t border-zinc-800 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="rowina-mono text-[10px] text-zinc-500 uppercase">Current PIN</span>
                  <span className="text-white font-bold tracking-widest">{appLockConfig.value}</span>
                </div>
                <button 
                  onClick={() => {
                    const newPin = prompt('Enter new 4-digit PIN:');
                    if (newPin && newPin.length === 4 && !isNaN(Number(newPin))) {
                      setAppLockConfig({ ...appLockConfig, value: newPin });
                    }
                  }}
                  className="w-full py-3 rounded-2xl border border-zinc-800 rowina-mono text-[10px] font-bold text-zinc-500 hover:bg-white/5 transition-all"
                >
                  CHANGE PIN
                </button>
              </div>
            )}
          </div>

          {userRole === 'executive' && (
            <div className="bg-rowina-gray border border-zinc-800 p-6 rounded-3xl space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <Key size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Executive Password</h4>
                  <p className="rowina-mono text-[10px] text-zinc-500 uppercase">FOR ROLE SWITCHING</p>
                </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <div className="relative">
                  <input 
                    type="password"
                    placeholder="NEW PASSWORD"
                    value={newExecPassword}
                    onChange={(e) => setNewExecPassword(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs rowina-mono focus:border-emerald-500 outline-none transition-all text-white"
                  />
                </div>
                <button 
                  onClick={handleUpdatePassword}
                  disabled={isUpdatingExecPassword || !newExecPassword}
                  className={cn(
                    "w-full py-3 rounded-2xl font-bold rowina-mono text-[10px] transition-all flex items-center justify-center gap-2",
                    newExecPassword ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  )}
                >
                  {isUpdatingExecPassword ? "UPDATING..." : "UPDATE PASSWORD"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {settingsTab === 'system' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-rowina-gray border border-zinc-800 p-6 rounded-3xl space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-zinc-800 text-zinc-500">
                  <Globe size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Currency</h4>
                  <p className="rowina-mono text-[10px] text-zinc-500 uppercase">Display Currency</p>
                </div>
              </div>
              <select 
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs rowina-mono text-white outline-none focus:border-rowina-blue"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="NGN">NGN (₦)</option>
                <option value="GHS">GHS (₵)</option>
                <option value="KES">KES (Sh)</option>
              </select>
            </div>
          </div>

          <div className="bg-rowina-gray border border-zinc-800 p-6 rounded-3xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-zinc-800 text-zinc-500">
                <Smartphone size={20} />
              </div>
              <div>
                <h4 className="font-bold text-white mb-1">PWA Status</h4>
                <p className="rowina-mono text-[10px] text-zinc-500 uppercase">
                  {isStandalone ? 'INSTALLED & ACTIVE' : 'RUNNING IN BROWSER'}
                </p>
              </div>
            </div>
            
            {!isStandalone && showInstallButton && (
              <button 
                onClick={handleInstallClick}
                className="w-full py-4 rounded-2xl bg-rowina-blue text-white font-bold rowina-mono text-[10px] flex items-center justify-center gap-3 hover:bg-rowina-blue/90 transition-all"
              >
                <Download size={18} /> INSTALL ROWINA SALES
              </button>
            )}

            {isIOS && !isStandalone && (
              <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                <p className="text-[10px] rowina-mono text-zinc-500 leading-relaxed">
                  ON IOS: TAP <Share2 size={12} className="inline mx-1" /> THEN "ADD TO HOME SCREEN" TO INSTALL THE PWA FOR THE BEST EXPERIENCE.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
