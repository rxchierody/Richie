import React from 'react';
import { motion } from 'motion/react';
import { Plus, AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { AlertRule, TriggeredAlert } from '../types';

interface AlertsProps {
  triggeredAlerts: TriggeredAlert[];
  alertRules: AlertRule[];
  setTriggeredAlerts: (alerts: TriggeredAlert[]) => void;
  setIsAlertModalOpen: (open: boolean) => void;
  handleDeleteAlertRule: (id: string) => void;
}

const Alerts: React.FC<AlertsProps> = ({
  triggeredAlerts,
  alertRules,
  setTriggeredAlerts,
  setIsAlertModalOpen,
  handleDeleteAlertRule
}) => {
  return (
    <motion.div
      key="alerts"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold rowina-title">Alert Command</h2>
        <button 
          onClick={() => setIsAlertModalOpen(true)}
          className="w-10 h-10 rounded-full rowina-pill-active flex items-center justify-center"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Triggered Alerts Section */}
      {triggeredAlerts.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="rowina-mono text-[10px] font-bold text-rowina-blue tracking-widest">ACTIVE INCIDENTS</h3>
            <div className="flex gap-4">
              <button 
                onClick={() => setTriggeredAlerts(triggeredAlerts.map(a => ({ ...a, isRead: true })))}
                className="text-[8px] rowina-mono text-zinc-500 hover:text-white transition-colors"
              >
                MARK ALL AS READ
              </button>
              <button 
                onClick={() => setTriggeredAlerts([])}
                className="text-[8px] rowina-mono text-rose-500 hover:text-rose-400 transition-colors"
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
                  alert.isRead ? "bg-rowina-gray/30 border-zinc-800/50 opacity-60" : "bg-rose-500/10 border-rose-500/30"
                )}
              >
                <div className={cn("p-2 rounded-lg mt-1", alert.isRead ? "bg-zinc-800 text-zinc-500" : "bg-rose-500 text-white")}>
                  <AlertTriangle size={14} />
                </div>
                <div className="flex-1">
                  <p className={cn("text-xs font-bold", alert.isRead ? "text-zinc-400" : "text-white")}>{alert.message}</p>
                  <p className="rowina-mono text-[8px] text-zinc-600 mt-1 uppercase">{new Date(alert.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="rowina-mono text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Active Rules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alertRules.map(rule => (
            <div key={rule.id} className="bg-rowina-gray border border-zinc-800 p-6 rounded-3xl flex justify-between items-start group">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    rule.type === 'STOCK_LOW' ? "bg-amber-500" : "bg-rose-500"
                  )} />
                  <h4 className="text-sm font-bold text-white uppercase tracking-tight">{rule.name}</h4>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  {rule.type === 'STOCK_LOW' ? `Triggers when stock falls below ${rule.threshold}` : 
                   rule.type === 'EXPENSE_HIGH' ? `Triggers when daily expenses exceed ${rule.threshold}` :
                   `Triggers when daily revenue exceeds ${rule.threshold}`}
                </p>
              </div>
              <button 
                onClick={() => handleDeleteAlertRule(rule.id)}
                className="p-2 text-zinc-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {alertRules.length === 0 && (
            <div className="md:col-span-2 py-12 text-center border border-dashed border-zinc-800 rounded-3xl">
              <p className="rowina-mono text-[10px] text-zinc-700 italic">NO ACTIVE MONITORING RULES</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Alerts;
