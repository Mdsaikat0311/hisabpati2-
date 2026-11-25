import React, { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import { APP_CURRENCIES } from '../data/currencies';
import { SubScreenHeader, TranslucentCard } from '../components/GlassPrimitives';

export function CurrencySelectionScreen() {
  const { settings, updateSettings, closeSubScreen, showSnackbar } = useWallet();
  const isBn = settings.language === 'BANGLA';
  const [search, setSearch] = useState('');

  const filtered = APP_CURRENCIES.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.nameBn.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader title={t('select_currency', settings.language)} onBack={closeSubScreen} />
      <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_currency_hint', settings.language)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl glass-card text-sm outline-none"
          />
        </div>

        <TranslucentCard className="divide-y divide-slate-200/60 dark:divide-white/10">
          {filtered.map((c) => {
            const active = settings.currencyCode === c.code;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  updateSettings({ currencyCode: c.code, currencySymbol: c.symbol });
                  showSnackbar(`${c.code} (${c.symbol})`);
                  closeSubScreen();
                }}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/70 dark:hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{c.flag}</span>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {c.code} ({c.symbol})
                    </p>
                    <p className="text-xs text-slate-500">{isBn ? c.nameBn : c.name}</p>
                  </div>
                </div>
                {active && (
                  <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center">
                    <Check size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </TranslucentCard>
      </div>
    </div>
  );
}
