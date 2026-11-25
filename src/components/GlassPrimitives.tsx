import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

export function TranslucentCard({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-[22px] ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function SubScreenHeader({
  title,
  subtitle,
  onBack,
  rightAction,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  rightAction?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-slate-50/80 dark:bg-[#0B132B]/80 border-b border-slate-200/60 dark:border-white/10">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-[16px] font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {rightAction && <div className="shrink-0 flex items-center gap-2">{rightAction}</div>}
      </div>
    </header>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-1 mb-2.5">
      <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">{title}</h2>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function SnackbarToast() {
  const { snackbar, dismissSnackbar } = useWallet();
  if (!snackbar) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,420px)]">
      <div className="crystal-nav-pill rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-xl">
        <span className="text-xs font-medium text-slate-800 dark:text-slate-100">{snackbar.message}</span>
        <div className="flex items-center gap-2 shrink-0">
          {snackbar.actionLabel && snackbar.onAction && (
            <button
              type="button"
              onClick={() => {
                snackbar.onAction?.();
                dismissSnackbar();
              }}
              className="text-xs font-bold text-sky-600 dark:text-sky-400 px-2 py-1 rounded-lg hover:bg-sky-500/10"
            >
              {snackbar.actionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={dismissSnackbar}
            className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
