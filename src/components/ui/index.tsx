import React from 'react';
import { cn, avatarColor } from '@/lib/utils';

// ─── Button ──────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'green';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary', size = 'md', loading, icon, iconRight,
  fullWidth, children, className, disabled, ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-bold rounded-[16px] transition-all active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary:   'bg-[--or] text-white shadow-[var(--shadow-or)] active:bg-[#E04D00]',
    secondary: 'bg-[--bg] text-[--dark] border border-[--bd] active:bg-[--bd]',
    ghost:     'bg-transparent text-[--or] active:bg-[--or-bg]',
    danger:    'bg-[--red-bg] text-[--red] active:bg-red-100',
    green:     'bg-[--green] text-white active:bg-[#188A65]',
  };

  const sizes = {
    sm: 'px-3 py-2 text-[13px] rounded-[12px]',
    md: 'px-4 py-[14px] text-[15px]',
    lg: 'px-5 py-[16px] text-[16px]',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading
        ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        : icon}
      {children}
      {iconRight}
    </button>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

interface AvatarProps {
  initials: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  className?: string;
}

export function Avatar({ initials, src, size = 'md', online, className }: AvatarProps) {
  const sizes = { xs: 'w-7 h-7 text-[10px]', sm: 'w-9 h-9 text-[12px]', md: 'w-11 h-11 text-[14px]', lg: 'w-13 h-13 text-[17px]', xl: 'w-16 h-16 text-[20px]' };
  const dotSizes = { xs: 'w-2 h-2', sm: 'w-2.5 h-2.5', md: 'w-3 h-3', lg: 'w-3.5 h-3.5', xl: 'w-4 h-4' };

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      {src ? (
        <img src={src} className={cn('rounded-full object-cover', sizes[size])} alt={initials} />
      ) : (
        <div
          className={cn('rounded-full flex items-center justify-center font-bold text-white', sizes[size])}
          style={{ background: avatarColor(initials) }}
        >
          {initials}
        </div>
      )}
      {online && (
        <span className={cn('absolute bottom-0 right-0 rounded-full bg-[--green] border-2 border-white', dotSizes[size])} />
      )}
    </div>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  label: string;
  color?: string;
  bg?: string;
  emoji?: string;
  className?: string;
}

export function StatusBadge({ label, color, bg, emoji, className }: StatusBadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-bold', className)}
      style={{ color: color ?? 'var(--muted)', background: bg ?? 'var(--bg)' }}
    >
      {emoji && <span>{emoji}</span>}
      {label}
    </span>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: boolean;
}

export function Card({ children, className, onClick, padding = true }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-[20px] border border-[--bd]',
        padding && 'p-4',
        onClick && 'cursor-pointer active:bg-[#FAFAF8] transition-colors',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ─── Stars ───────────────────────────────────────────────────────────────────

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: size, color: i <= Math.round(rating) ? 'var(--or)' : 'var(--bd)' }}>★</span>
      ))}
    </div>
  );
}

// ─── BottomNav ───────────────────────────────────────────────────────────────

interface NavItem { id: string; label: string; icon: string; badge?: number; }

interface BottomNavProps {
  active: string;
  onNavigate: (id: string) => void;
  onPlus?: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',    label: 'Home',    icon: '⊞' },
  { id: 'map',     label: 'Mappa',   icon: '◎' },
  { id: 'plus',    label: '',        icon: '+' },
  { id: 'chat',    label: 'Chat',    icon: '✉' },
  { id: 'profile', label: 'Profilo', icon: '◯' },
];

export function BottomNav({ active, onNavigate, onPlus }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[--bd] flex z-40"
         style={{ paddingBottom: 'calc(12px + var(--safe-bottom))' }}>
      {NAV_ITEMS.map(item => {
        if (item.id === 'plus') return (
          <button key="plus"
            className="flex-1 flex flex-col items-center justify-end pb-1 border-none bg-transparent cursor-pointer"
            onClick={onPlus}
            aria-label="Nuova richiesta"
          >
            <div className="w-12 h-12 rounded-full bg-[--or] flex items-center justify-center -mt-5 border-4 border-[--bg] shadow-[var(--shadow-or)]">
              <span className="text-white text-2xl font-bold leading-none">+</span>
            </div>
          </button>
        );
        const isActive = active === item.id;
        return (
          <button key={item.id}
            className="flex-1 flex flex-col items-center justify-center gap-1 border-none bg-transparent cursor-pointer relative"
            onClick={() => onNavigate(item.id)}
            aria-label={item.label}
          >
            <span className="text-[22px] leading-none" style={{ color: isActive ? 'var(--or)' : 'var(--muted)' }}>
              {item.icon}
            </span>
            <span className="text-[10px] font-semibold" style={{ color: isActive ? 'var(--or)' : 'var(--muted)' }}>
              {item.label}
            </span>
            {item.badge ? (
              <span className="absolute top-1 right-3 w-4 h-4 bg-[--or] text-white rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-white">
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

// ─── SectionHeader ───────────────────────────────────────────────────────────

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <h2 className="text-[15px] font-black text-[--dark] tracking-tight">{title}</h2>
      {action && <button className="text-[13px] font-bold text-[--or] bg-transparent border-none cursor-pointer" onClick={onAction}>{action}</button>}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg animate-pulse', className)}
         style={{ background: 'linear-gradient(90deg, var(--bd) 0%, #F0EFE9 50%, var(--bd) 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite linear' }} />
  );
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

interface ToggleProps { checked: boolean; onChange: (v: boolean) => void; }

export function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative w-11 h-[26px] rounded-full border-none cursor-pointer transition-colors duration-200 flex-shrink-0"
      style={{ background: checked ? 'var(--or)' : 'var(--bd)' }}
    >
      <span className="absolute top-[3px] left-[3px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200"
            style={{ transform: checked ? 'translateX(18px)' : 'translateX(0)' }} />
    </button>
  );
}

// ─── FieldRow ────────────────────────────────────────────────────────────────

interface FieldRowProps {
  icon: React.ReactNode;
  iconBg?: string;
  label: string;
  value?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  last?: boolean;
}

export function FieldRow({ icon, iconBg, label, value, children, onClick, last }: FieldRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3.5 py-3',
        !last && 'border-b border-[--bd]',
        onClick && 'cursor-pointer active:bg-[#FAFAF8]'
      )}
      onClick={onClick}
    >
      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 text-base"
           style={{ background: iconBg ?? 'var(--bg)' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-[--muted] uppercase tracking-wide mb-0.5">{label}</div>
        {value && <div className="text-[14px] font-bold text-[--dark] truncate">{value}</div>}
        {children}
      </div>
      {onClick && <span className="text-[--bd] text-base">›</span>}
    </div>
  );
}
