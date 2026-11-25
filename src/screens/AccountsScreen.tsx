import React, { useMemo, useState } from 'react';
import {
  Plus,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ArchiveRestore,
  Layers,
  List,
  X,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import { calculateNetWorthSummary } from '../utils/analytics';
import { formatCurrency } from '../utils/formatters';
import { SubScreenHeader, TranslucentCard, SectionHeader } from '../components/GlassPrimitives';
import { HishabPatiAccountCard } from '../components/HishabPatiAccountCard';
import type { AccountSortOption } from '../types/models';

export function AccountsScreen() {
  const {
    accounts,
    settings,
    accountSortOption,
    setAccountSortOption,
    reorderAccounts,
    toggleArchiveAccount,
    openSubScreen,
    closeSubScreen,
  } = useWallet();
  const isBn = settings.language === 'BANGLA';

  const [grouped, setGrouped] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  const netWorth = useMemo(() => calculateNetWorthSummary(accounts), [accounts]);

  const sortedActive = useMemo(() => {
    const active = accounts.filter((a) => !a.isHidden);
    return [...active].sort((a, b) => {
      if (accountSortOption === 'BALANCE_DESC') return b.balance - a.balance;
      if (accountSortOption === 'BALANCE_ASC') return a.balance - b.balance;
      if (accountSortOption === 'NAME_ASC') return a.name.localeCompare(b.name);
      if (accountSortOption === 'NAME_DESC') return b.name.localeCompare(a.name);
      if (accountSortOption === 'TYPE') return a.type.localeCompare(b.type);
      return a.sortOrder - b.sortOrder;
    });
  }, [accountSortOption, accounts]);

  const archivedAccounts = useMemo(() => accounts.filter((a) => a.isHidden), [accounts]);

  const availableFunds = useMemo(
    () => sortedActive.filter((a) => a.type !== 'CREDIT_CARD'),
    [sortedActive]
  );
  const creditAccounts = useMemo(
    () => sortedActive.filter((a) => a.type === 'CREDIT_CARD'),
    [sortedActive]
  );

  const moveOrder = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= sortedActive.length) return;
    const ids = sortedActive.map((a) => a.id);
    const [moved] = ids.splice(idx, 1);
    ids.splice(target, 0, moved);
    reorderAccounts(ids);
  };

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader
        title={t('accounts', settings.language)}
        subtitle={`${sortedActive.length} ${t('accounts_count_suffix', settings.language)}`}
        onBack={closeSubScreen}
        rightAction={
          <button
            type="button"
            onClick={() => openSubScreen('EDIT_ACCOUNT')}
            className="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-bold flex items-center gap-1"
          >
            <Plus size={14} /> {t('add', settings.language)}
          </button>
        }
      />

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-5">
        {/* Net Worth Summary Card */}
        <TranslucentCard className="p-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[11px] text-slate-500">{t('assets', settings.language)}</p>
            <p className="text-sm font-extrabold font-mono-num text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrency(netWorth.assets, settings.currencySymbol, settings.language)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500">{t('liabilities', settings.language)}</p>
            <p className="text-sm font-extrabold font-mono-num text-rose-600 dark:text-rose-400 mt-0.5">
              {formatCurrency(netWorth.liabilities, settings.currencySymbol, settings.language)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500">{t('net_worth', settings.language)}</p>
            <p className="text-sm font-extrabold font-mono-num text-slate-900 dark:text-white mt-0.5">
              {formatCurrency(netWorth.netWorth, settings.currencySymbol, settings.language)}
            </p>
          </div>
        </TranslucentCard>

        {/* Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setGrouped((g) => !g)}
              className="px-3 py-1.5 rounded-xl glass-card text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
            >
              {grouped ? <Layers size={14} /> : <List size={14} />}
              <span>
                {grouped ? t('grouped_short', settings.language) : t('single_list_short', settings.language)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowSortModal(true)}
              className="px-3 py-1.5 rounded-xl glass-card text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
            >
              <ArrowUpDown size={14} />
              <span>{t('sort', settings.language)}</span>
            </button>
          </div>

          {archivedAccounts.length > 0 && (
            <button
              type="button"
              onClick={() => setShowArchived((s) => !s)}
              className="px-3 py-1.5 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300"
            >
              {t('archived_badge', settings.language)} ({archivedAccounts.length})
            </button>
          )}
        </div>

        {/* Account Cards */}
        {sortedActive.length === 0 ? (
          <TranslucentCard className="p-8 text-center space-y-3">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {isBn ? 'কোনো সক্রিয় অ্যাকাউন্ট নেই' : 'No active accounts yet'}
            </p>
            <button
              type="button"
              onClick={() => openSubScreen('EDIT_ACCOUNT')}
              className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold"
            >
              + {t('add_account', settings.language)}
            </button>
          </TranslucentCard>
        ) : grouped ? (
          <div className="space-y-5">
            {availableFunds.length > 0 && (
              <div className="space-y-3">
                <SectionHeader title={t('available_funds_header', settings.language)} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableFunds.map((acc) => (
                    <HishabPatiAccountCard
                      key={acc.id}
                      account={acc}
                      currencySymbol={settings.currencySymbol}
                      language={settings.language}
                      compact
                      onClick={() => openSubScreen('ACCOUNT_DETAIL', { accountId: acc.id })}
                    />
                  ))}
                </div>
              </div>
            )}

            {creditAccounts.length > 0 && (
              <div className="space-y-3">
                <SectionHeader title={t('credit_and_dues_header', settings.language)} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {creditAccounts.map((acc) => (
                    <HishabPatiAccountCard
                      key={acc.id}
                      account={acc}
                      currencySymbol={settings.currencySymbol}
                      language={settings.language}
                      compact
                      onClick={() => openSubScreen('ACCOUNT_DETAIL', { accountId: acc.id })}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sortedActive.map((acc) => (
              <HishabPatiAccountCard
                key={acc.id}
                account={acc}
                currencySymbol={settings.currencySymbol}
                language={settings.language}
                compact
                onClick={() => openSubScreen('ACCOUNT_DETAIL', { accountId: acc.id })}
              />
            ))}
          </div>
        )}

        {/* Archived Accounts Section */}
        {showArchived && archivedAccounts.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <SectionHeader title={t('archived_badge', settings.language)} />
            <TranslucentCard className="divide-y divide-slate-200/60 dark:divide-white/10">
              {archivedAccounts.map((acc) => (
                <div key={acc.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{acc.name}</p>
                    <p className="text-xs text-slate-500 font-mono-num">
                      {formatCurrency(acc.balance, settings.currencySymbol, settings.language)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleArchiveAccount(acc.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1"
                  >
                    <ArchiveRestore size={14} /> {t('restore_label', settings.language)}
                  </button>
                </div>
              ))}
            </TranslucentCard>
          </div>
        )}
      </div>

      {/* Sort & Reorder Modal */}
      {showSortModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md max-h-[82vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('sort', settings.language)} & {t('reorder_short', settings.language)}
              </h3>
              <button type="button" onClick={() => setShowSortModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['CUSTOM', isBn ? 'কাস্টম ক্রম' : 'Custom Order'],
                    ['BALANCE_DESC', isBn ? 'সর্বোচ্চ ব্যালেন্স' : 'Highest Balance'],
                    ['BALANCE_ASC', isBn ? 'সর্বনিম্ন ব্যালেন্স' : 'Lowest Balance'],
                    ['NAME_ASC', 'A → Z'],
                    ['NAME_DESC', 'Z → A'],
                    ['TYPE', t('type', settings.language)],
                  ] as Array<[AccountSortOption, string]>
                ).map(([opt, label]) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAccountSortOption(opt)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border text-left ${
                      accountSortOption === opt
                        ? 'border-sky-500 bg-sky-500/15 text-sky-600 dark:text-sky-400'
                        : 'border-slate-200 dark:border-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-slate-500">
                  {t('reorder_short', settings.language)}
                </p>
                {sortedActive.map((acc, idx) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70"
                  >
                    <span className="text-xs font-bold truncate">{acc.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveOrder(idx, -1)}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                      >
                        <ChevronUp size={15} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === sortedActive.length - 1}
                        onClick={() => moveOrder(idx, 1)}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                      >
                        <ChevronDown size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
