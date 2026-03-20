import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  trend: number;
  inverse?: boolean;
  highlight?: "white" | "emerald" | "rose";
}

export const StatCard = ({ 
  label, 
  value, 
  trend, 
  inverse = false, 
  highlight = "white" 
}: StatCardProps) => {
  const isPositive = trend >= 0;
  const isGood = inverse ? !isPositive : isPositive;
  
  return (
    <div className="bg-rowina-gray p-5 sm:p-6 rounded-[32px] border border-zinc-800 relative min-h-[110px] flex flex-col justify-between">
      <p className="rowina-mono text-[10px] text-zinc-500 uppercase tracking-widest">{label}</p>
      <div className="mt-2">
        <p className={cn(
          "text-3xl sm:text-4xl font-bold tracking-tight",
          highlight === "emerald" ? "text-emerald-500" : highlight === "rose" ? "text-rose-500" : "text-white"
        )}>{value}</p>
      </div>
      <div className={cn(
        "absolute bottom-5 right-6 flex items-center gap-1 rowina-mono text-[10px] font-bold",
        isGood ? "text-emerald-500" : "text-rose-500"
      )}>
        {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {Math.abs(trend).toFixed(0)}%
      </div>
    </div>
  );
};
