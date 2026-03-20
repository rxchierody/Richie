import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const EAST_AFRICAN_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'RF' },
  { code: 'BIF', name: 'Burundian Franc', symbol: 'FBu' },
  { code: 'SSP', name: 'South Sudanese Pound', symbol: 'SSP' },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br' },
  { code: 'SOS', name: 'Somali Shilling', symbol: 'S' },
  { code: 'DJF', name: 'Djiboutian Franc', symbol: 'Fdj' },
  { code: 'ERN', name: 'Eritrean Nakfa', symbol: 'Nfk' },
];

export function formatCurrency(amount: number, currencyCode: string = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currencyCode === 'UGX' || currencyCode === 'TZS' || currencyCode === 'RWF' || currencyCode === 'BIF' ? 0 : 2,
    }).format(amount);
  } catch (e) {
    // Fallback if currency code is not supported by Intl
    const currency = EAST_AFRICAN_CURRENCIES.find(c => c.code === currencyCode) || EAST_AFRICAN_CURRENCIES[0];
    return `${currency.symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }
}

export function calculateMarkup(buying: number, selling: number) {
  if (buying === 0) return 0;
  return ((selling - buying) / buying) * 100;
}

export function calculateMargin(buying: number, selling: number) {
  if (selling === 0) return 0;
  return ((selling - buying) / selling) * 100;
}

export function round(value: number, decimals: number = 2): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

export function f(amount: number, currencyCode: string = 'USD') {
  return formatCurrency(amount, currencyCode);
}
