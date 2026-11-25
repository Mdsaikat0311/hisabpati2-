import React, { useMemo, useState } from 'react';
import {
  Plus,
  ArrowLeftRight,
  CreditCard,
  Sliders,
  Edit3,
  Copy,
  Archive,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import { getLast90DayDailyFlow } from '../utils/analytics';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { SubScreenHeader, TranslucentCard } from '../components/GlassPrimitives';
import { HishabPatiAccountCard } from '../components/HishabPatiAccountCard';
import { CategoryIcon } from '../components/CategoryIcon';

export function AccountDetailScreen({ accountId }: { accountId: string }) {
  const {
    accounts,
    transactions,
    categories,
    settings,
    closeSubScreen,
    openSubScreen,
    openAddTransaction,
    toggleArchiveAccount,
    showSnackbar,
  } = useWallet();
  const isBn = settings.language === 'BANGLA';

  const [txFilter, setTxFilter] = useState<'ALL' | 'IN' | 'OUT' | 'PAYMENTS'>('ALL');
  const account = accounts.find((a) => a.id === accountId);

  const accountTransactions = useMemo(
    () =>
      transactions
        .filter((tx) => tx.accountId === accountId || tx.toAccountId === accountId)
        .sort((a, b) => b.timestamp - a.timestamp),
    [accountId, transactions]
  );

  const monthFlow = useMemo(() => {
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let inMonth = 0;
    let outMonth = 0;
    for (const tx of accountTransactions) {
      if (tx.timestamp < mStart) continue;
      if (tx.type === 'INCOME' || tx.type === 'BORROW') inMonth += tx.amount;
      else if (tx.type === 'EXPENSE' || tx.type === 'LEND') outMonth += tx.amount;
      else if (tx.type === 'TRANSFER' || tx.type === 'CC_PAYMENT') {
        if (tx.toAccountId === accountId) inMonth += tx.amount;
        if (tx.accountId === accountId) outMonth += tx.amount;
      }
    }
    return { inMonth, outMonth };
  }, [accountId, accountTransactions]);

  const buckets90 = useMemo(
    () => getLast90DayDailyFlow(transactions, accountId),
    [accountId, transactions]
  );

  const filteredList = useMemo(() => {
    return accountTransactions.filter((tx) => {
      if (txFilter === 'ALL') return true;
      const isIn =
        tx.type === 'INCOME' ||
        tx.type === 'BORROW' ||
        ((tx.type === 'TRANSFER' || tx.type === 'CC_PAYMENT') && tx.toAccountId === accountId);
      const isPay = tx.type === 'TRANSFER' || tx.type === 'CC_PAYMENT';
      if (txFilter === 'IN') return isIn;
      if (txFilter === 'OUT') return !isIn;
      if (txFilter === 'PAYMENTS') return isPay;
      return true;
    });
  }, [accountId, accountTransactions, txFilter]);

  if (!account) {
    return (
      <div>
        <SubScreenHeader title={t('accounts', settings.language)} onBack={closeSubScreen} />
        <div className="p-8 text-center text-sm text-slate-500">Account not found.</div>
      </div>
    );
  }

  const maxBucket = Math.max(1, ...buckets90.map((b) => Math.max(b.income, b.expense)));

  const handleCopyStatement = async () => {
    const lines = [
      `Account Statement: ${account.name} (${account.institution || account.type})`,
      `Current Balance: ${formatCurrency(account.balance, settings.currencySymbol, settings.language)}`,
      `In This Month: ${formatCurrency(monthFlow.inMonth, settings.currencySymbol, settings.language)}`,
      `Out This Month: ${formatCurrency(monthFlow.outMonth, settings.currencySymbol, settings.language)}`,
      '--- Recent Transactions ---',
      ...accountTransactions.slice(0, 20).map(
        (tx) =>
          `${formatDateTime(tx.timestamp, settings.language)} | ${tx.type} | ${
            tx.title || tx.category
          } | ${formatCurrency(tx.amount, settings.currencySymbol, settings.language)}`
      ),
    ];
    await navigator.clipboard?.writeText(lines.join('\n')).catch(() => undefined);
    showSnackbar(t('copied_to_clipboard', settings.language));
  };

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader
        title={account.name}
        subtitle={account.institution || account.type}
        onBack={closeSubScreen}
        rightAction={
          <button
            type="button"
            onClick={() => openSubScreen('EDIT_ACCOUNT', { accountId: account.id })}
            className="w-9 h-9 rounded-full glass-card flex items-center justify-center"
            aria-label={t('edit_account', settings.language)}
          >
            <Edit3 size={16} />
          </button>
        }
      />

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-5">
        <HishabPatiAccountCard
          account={account}
          currencySymbol={settings.currencySymbol}
          language={settings.language}
        />

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => openAddTransaction({ preselectedAccountId: account.id })}
            className="glass-card rounded-2xl p-3 flex flex-col items-center gap-1.5 text-xs font-bold"
          >
            <Plus size={18} className="text-sky-600" />
            <span>{t('quick_add', settings.language)}</span>
          </button>
          {account.type === 'CREDIT_CARD' ? (
            <button
              type="button"
              onClick={() =>
                openAddTransaction({
                  initialType: 'CC_PAYMENT',
                  preselectedToAccountId: account.id,
                })
              }
              className="glass-card rounded-2xl p-3 flex flex-col items-center gap-1.5 text-xs font-bold"
            >
              <CreditCard size={18} className="text-emerald-600" />
              <span>{t('pay_bill', settings.language)}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                openAddTransaction({
                  initialType: 'TRANSFER',
                  preselectedAccountId: account.id,
                })
              }
              className="glass-card rounded-2xl p-3 flex flex-col items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeftRight size={18} className="text-violet-600" />
              <span>{t('transfer_label', settings.language)}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => openSubScreen('ADJUST_BALANCE', { accountId: account.id })}
            className="glass-card rounded-2xl p-3 flex flex-col items-center gap-1.5 text-xs font-bold"
          >
            <Sliders size={18} className="text-amber-600" />
            <span>{isBn ? 'ব্যালেন্স ঠিক' : 'Adjust'}</span>
          </button>
          <button
            type="button"
            onClick={() => void handleCopyStatement()}
            className="glass-card rounded-2xl p-3 flex flex-col items-center gap-1.5 text-xs font-bold"
          >
            <Copy size={18} className="text-teal-600" />
            <span>{t('statement_label', settings.language)}</span>
          </button>
        </div>

        {/* Monthly Flow + 90-Day Sparkline */}
        <TranslucentCard className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-emerald-500/10 p-3">
              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                {t('in_this_month', settings.language)}
              </p>
              <p className="text-base font-extrabold font-mono-num text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(monthFlow.inMonth, settings.currencySymbol, settings.language)}
              </p>
            </div>
            <div className="rounded-2xl bg-rose-500/10 p-3">
              <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300">
                {t('out_this_month', settings.language)}
              </p>
              <p className="text-base font-extrabold font-mono-num text-rose-600 dark:text-rose-400 mt-0.5">
                {formatCurrency(monthFlow.outMonth, settings.currencySymbol, settings.language)}
              </p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2">
              <span>{t('last_90_days', settings.language)}</span>
              <span>
                {t('ninety_days_ago', settings.language)} — {t('today_label', settings.language)}
              </span>
            </div>
            <div className="grid grid-cols-18 gap-1 items-end h-16">
              {buckets90.map((b, i) => {
                const inH = Math.round((b.income / maxBucket) * 100);
                const outH = Math.round((b.expense / maxBucket) * 100);
                return (
                  <div key={i} className="flex items-end justify-center gap-0.5 h-full" title={`${b.dayLabel}`}>
                    <div
                      className="w-1 rounded-t bg-emerald-500/80"
                      style={{ height: `${Math.max(6, inH)}%` }}
                    />
                    <div
                      className="w-1 rounded-t bg-rose-500/80"
                      style={{ height: `${Math.max(6, outH)}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </TranslucentCard>

        {/* Transactions Filter & List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('date_details_header', settings.language)}
            </span>
            <div className="flex gap-1">
              {(
                [
                  ['ALL', t('all_filter', settings.language)],
                  ['IN', isBn ? 'আয়' : 'In'],
                  ['OUT', isBn ? 'ব্যয়' : 'Out'],
                  ['PAYMENTS', t('payments_filter', settings.language)],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTxFilter(id)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                    txFilter === id
                      ? 'bg-sky-600 text-white'
                      : 'glass-card text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <TranslucentCard className="divide-y divide-slate-200/60 dark:divide-white/10">
            {filteredList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                {t('no_transactions_found', settings.language)}
              </div>
            ) : (
              filteredList.map((tx) => {
                const cat = categories.find(
                  (c) => c.name.toLowerCase() === tx.category.toLowerCase()
                );
                const isIn =
                  tx.type === 'INCOME' ||
                  tx.type === 'BORROW' ||
                  ((tx.type === 'TRANSFER' || tx.type === 'CC_PAYMENT') &&
                    tx.toAccountId === accountId);
                return (
                  <div
                    key={tx.id}
                    onClick={() => openAddTransaction({ editingTx: tx })}
                    className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-white/5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CategoryIcon
                        iconName={cat?.iconName || 'category'}
                        colorHex={cat?.colorHex || (isIn ? '#10B981' : '#0284C7')}
                        size={38}
                        iconSize={17}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {tx.title || tx.category}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {formatDateTime(tx.timestamp, settings.language)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-extrabold font-mono-num ${
                        isIn
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isIn ? '+' : '-'}
                      {formatCurrency(tx.amount, settings.currencySymbol, settings.language)}
                    </span>
                  </div>
                );
              })
            )}
          </TranslucentCard>
        </div>

        <button
          type="button"
          onClick={() => {
            toggleArchiveAccount(account.id);
            closeSubScreen();
          }}
          className="w-full py-3 rounded-2xl glass-card text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2"
        >
          <Archive size={14} />
          {account.isHidden
            ? isBn
              ? 'অ্যাকাউন্ট পুনরুদ্ধার করুন'
              : 'Restore Account'
            : isBn
            ? 'অ্যাকাউন্ট আর্কাইভ করুন'
            : 'Archive Account'}
        </button>
      </div>
    </div>
  );
}
