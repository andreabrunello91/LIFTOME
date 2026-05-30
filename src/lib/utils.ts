import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CATEGORIES, type CategoryId } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format currency in Italian locale */
export function formatEuro(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format compact currency (€12 instead of € 12,00) */
export function formatEuroCompact(amount: number): string {
  if (Number.isInteger(amount)) return `€ ${amount}`;
  return `€ ${amount.toFixed(2).replace('.', ',')}`;
}

/** Format distance */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Format relative time */
export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMs / 3600000);
  const diffD   = Math.floor(diffMs / 86400000);

  if (diffMin < 1)  return 'adesso';
  if (diffMin < 60) return `${diffMin} min fa`;
  if (diffH   < 24) return `${diffH} ore fa`;
  if (diffD   === 1) return 'ieri';
  if (diffD   < 7)  return `${diffD} giorni fa`;
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

/** Get initials from full name */
export function getInitials(name: string, surname?: string): string {
  if (surname) return `${name[0]}${surname[0]}`.toUpperCase();
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** Get category by id */
export function getCategory(id: CategoryId) {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

/** Liftome commission (10%) */
export const COMMISSION_RATE = 0.10;
export function calcTotal(price: number): number {
  return price * (1 + COMMISSION_RATE);
}
export function calcCommission(price: number): number {
  return price * COMMISSION_RATE;
}

/** Clamp a number */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/** Generate a random avatar color from a string */
const AVATAR_COLORS = [
  '#534AB7', '#0F6E56', '#993556', '#854F0B',
  '#1D9E75', '#C2186C', '#2563EB', '#7C3AED',
];
export function avatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
