import React from 'react';
import { X, Plus, Check } from 'lucide-react';
import type { AccountEntity } from '../types/models';
import { useWallet } from '../context/WalletContext';
import { formatCurrency } from '../utils/formatters';
import { getMfsLogoPath } from '../data/cardBrandAssets';
import { t } from '../data/appStrings';

export function WalletSelectionSheet({
  open,
  title,
  selectedAccountId,
  excludeAccountId,
  onSelect,
  onClose,
  onAddNewWallet,
}: {
  open: boolean;
  title: string;
  selectedAccountId: string;
  excludeAccountId?: string;
  onSelect: (account: AccountEntity) => void;
  onClose: () => void;
  onAddNewWallet?: () => void;
}) {
  const { accounts, settings } = useWallet();
  const isBn = settings.language === 'BANGLA';

  if (!open) return null;

  const visibleAccounts = accounts.filter(
    (a) => !a.isHidden && (!excludeAccountId || a.id !== excludeAccountId)
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md max-h-[80vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
          <div className="flex items-center gap-2">
            {onAddNewWallet && (
              <button
                type="button"
                onClick={onAddNewWallet}
                className="px-3 py-1.5 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center gap-1"
              >
                <Plus size={14} /> {t('add', settings.language)}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {visibleAccounts.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isBn ? 'কোনো অ্যাকাউন্ট পাওয়া যায়নি' : 'No accounts found'}
              </p>
              {onAddNewWallet && (
                <button
                  type="button"
                  onClick={onAddNewWallet}
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold"
                >
                  {t('add_account', settings.language)}
                </button>
              )}
            </div>
          ) : (
            visibleAccounts.map((acc) => {
              const isSelected = acc.id === selectedAccountId;
              const mfsLogo = acc.type === 'MFS' ? getMfsLogoPath(acc.institution || acc.name) : null;
              const bal =
                acc.type === 'CREDIT_CARD' && acc.balance < 0
                  ? Math.abs(acc.balance)
                  : acc.balance;

              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    onSelect(acc);
                    onClose();
                  }}
                  className={`w-full p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left transition ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/30'
                      : 'border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden"
                      style={{ backgroundColor: acc.colorHex || '#0284C7' }}
                    >
                      {mfsLogo ? (
                        <img src={mfsLogo} alt="" className="w-7 h-7 object-contain" />
                      ) : (
                        acc.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {acc.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {acc.institution || acc.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold font-mono-num text-slate-900 dark:text-white">
                      {formatCurrency(bal, settings.currencySymbol, settings.language)}
                    </span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center">
                        <Check size={12} />
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
