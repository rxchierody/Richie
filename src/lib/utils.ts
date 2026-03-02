import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function calculateMarkup(buying: number, selling: number) {
  if (buying === 0) return 0;
  return ((selling - buying) / buying) * 100;
}

export function calculateMargin(buying: number, selling: number) {
  if (selling === 0) return 0;
  return ((selling - buying) / selling) * 100;
}
