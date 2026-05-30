import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  emoji?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  show: (toast: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  info:    (title: string, message?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const show = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { ...toast, id }]);
    setTimeout(() => dismiss(id), toast.duration ?? 3500);
  }, [dismiss]);

  const success = useCallback((title: string, message?: string) => show({ type: 'success', title, message, emoji: '✅' }), [show]);
  const error   = useCallback((title: string, message?: string) => show({ type: 'error',   title, message, emoji: '❌' }), [show]);
  const info    = useCallback((title: string, message?: string) => show({ type: 'info',    title, message, emoji: 'ℹ️' }), [show]);

  return (
    <ToastContext.Provider value={{ toasts, show, success, error, info, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ─── ToastContainer ───────────────────────────────────────────────────────────

const STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'var(--green-bg)',   border: '#9FE1CB',           icon: '✅' },
  error:   { bg: 'var(--red-bg)',     border: '#F5B8B3',           icon: '❌' },
  info:    { bg: 'var(--or-bg)',      border: 'var(--or-bd)',      icon: 'ℹ️' },
  warning: { bg: 'var(--amber-bg)',   border: 'var(--amber-bd)',   icon: '⚠️' },
};

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[90vw] max-w-[360px]"
         style={{ top: 'calc(16px + var(--safe-top))' }}>
      {toasts.map(t => {
        const s = STYLES[t.type];
        return (
          <div key={t.id}
            className="flex items-start gap-3 px-4 py-3.5 rounded-[16px] border shadow-lg animate-fade-up cursor-pointer"
            style={{ background: s.bg, borderColor: s.border }}
            onClick={() => onDismiss(t.id)}>
            <span className="text-xl flex-shrink-0 mt-0.5">{t.emoji ?? s.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-black text-[--dark] leading-tight">{t.title}</div>
              {t.message && <div className="text-[12px] text-[--muted] mt-0.5 leading-snug">{t.message}</div>}
            </div>
            <button className="text-[--muted] text-lg leading-none mt-0.5 flex-shrink-0 bg-transparent border-none cursor-pointer">✕</button>
          </div>
        );
      })}
    </div>
  );
}
