import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  Trash2,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import {
  formatCurrency,
  formatMonthYear,
  formatShortDate,
  formatTime,
  localizeDigits,
} from '../utils/formatters';
import { TranslucentCard } from '../components/GlassPrimitives';
import type { AccountEntity, TransactionEntity } from '../types/models';

export function ReportScreen() {
  const {
    accounts,
    transactions,
    spendingWays,
    settings,
    deleteTransaction,
  } = useWallet();
  const isBn = settings.language === 'BANGLA';

  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth0, setSelectedMonth0] = useState(now.getMonth());
  const [selectedWayFilter, setSelectedWayFilter] = useState<string>('ALL');
  const [selectedCardFilter, setSelectedCardFilter] = useState<string>('ALL');
  const [expandedWays, setExpandedWays] = useState<Set<string>>(new Set());

  const visibleAccounts = useMemo(
    () => accounts.filter((a) => !a.isHidden).sort((a, b) => a.sortOrder - b.sortOrder),
    [accounts]
  );

  const stepMonth = (delta: number) => {
    const d = new Date(selectedYear, selectedMonth0 + delta, 1);
    setSelectedYear(d.getFullYear());
    setSelectedMonth0(d.getMonth());
  };

  const monthRange = useMemo(() => {
    return {
      start: new Date(selectedYear, selectedMonth0, 1, 0, 0, 0, 0).getTime(),
      end: new Date(selectedYear, selectedMonth0 + 1, 0, 23, 59, 59, 999).getTime(),
    };
  }, [selectedMonth0, selectedYear]);

  // Transactions in the selected month
  const monthTransactions = useMemo(
    () =>
      transactions
        .filter((tx) => tx.timestamp >= monthRange.start && tx.timestamp <= monthRange.end)
        .sort((a, b) => b.timestamp - a.timestamp),
    [monthRange, transactions]
  );

  // Filtered by card if a card filter is active
  const scopedMonthTransactions = useMemo(() => {
    if (selectedCardFilter === 'ALL') return monthTransactions;
    return monthTransactions.filter(
      (tx) => tx.accountId === selectedCardFilter || tx.toAccountId === selectedCardFilter
    );
  }, [monthTransactions, selectedCardFilter]);

  // Overall month totals & current available total
  const totals = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    for (const tx of scopedMonthTransactions) {
      if (tx.type === 'INCOME' || tx.type === 'BORROW') {
        totalIn += tx.amount;
      } else if (tx.type === 'EXPENSE' || tx.type === 'LEND') {
        totalOut += tx.amount;
      } else if (selectedCardFilter !== 'ALL') {
        if (tx.toAccountId === selectedCardFilter) totalIn += tx.amount;
        if (tx.accountId === selectedCardFilter) totalOut += tx.amount;
      }
    }

    const currentBalance =
      selectedCardFilter !== 'ALL'
        ? accounts.find((a) => a.id === selectedCardFilter)?.balance ?? 0
        : visibleAccounts
            .filter((a) => a.includeInTotal)
            .reduce((sum, a) => sum + a.balance, 0);

    return { totalIn, totalOut, currentBalance };
  }, [accounts, scopedMonthTransactions, selectedCardFilter, visibleAccounts]);

  // Per-card monthly In, Out, and current balance
  const cardBreakdown = useMemo(() => {
    return visibleAccounts.map((acc) => {
      let inAmt = 0;
      let outAmt = 0;
      let count = 0;
      for (const tx of monthTransactions) {
        if (tx.accountId !== acc.id && tx.toAccountId !== acc.id) continue;
        count += 1;
        if (tx.accountId === acc.id) {
          if (tx.type === 'INCOME' || tx.type === 'BORROW') inAmt += tx.amount;
          else outAmt += tx.amount;
        }
        if (tx.toAccountId === acc.id && (tx.type === 'TRANSFER' || tx.type === 'CC_PAYMENT')) {
          inAmt += tx.amount;
        }
      }
      return { account: acc, inAmt, outAmt, count };
    });
  }, [monthTransactions, visibleAccounts]);

  // Build list of all khath names (configured ways + any historical way found in this month)
  const wayNames = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const w of spendingWays) {
      const k = w.name.trim();
      if (k && !seen.has(k.toLowerCase())) {
        seen.add(k.toLowerCase());
        list.push(k);
      }
    }
    for (const tx of scopedMonthTransactions) {
      const label = (tx.subcategory || tx.category || (isBn ? 'অন্যান্য' : 'Other')).trim();
      if (label && !seen.has(label.toLowerCase())) {
        seen.add(label.toLowerCase());
        list.push(label);
      }
    }
    return list;
  }, [isBn, scopedMonthTransactions, spendingWays]);

  // Per-khath (Way) breakdown with card-by-card sub-totals inside each khath
  const khathReports = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        totalIn: number;
        totalOut: number;
        items: TransactionEntity[];
        byCard: Map<
          string,
          { account: AccountEntity | undefined; cardName: string; inAmt: number; outAmt: number }
        >;
      }
    >();

    // Seed configured ways so user can always scroll through all of them
    for (const name of wayNames) {
      map.set(name.toLowerCase(), {
        name,
        totalIn: 0,
        totalOut: 0,
        items: [],
        byCard: new Map(),
      });
    }

    for (const tx of scopedMonthTransactions) {
      const wayLabel = (tx.subcategory || tx.category || (isBn ? 'অন্যান্য' : 'Other')).trim();
      const key = wayLabel.toLowerCase();
      let bucket = map.get(key);
      if (!bucket) {
        bucket = {
          name: wayLabel,
          totalIn: 0,
          totalOut: 0,
          items: [],
          byCard: new Map(),
        };
        map.set(key, bucket);
      }

      const isIn =
        tx.type === 'INCOME' ||
        tx.type === 'BORROW' ||
        (selectedCardFilter !== 'ALL' &&
          (tx.type === 'TRANSFER' || tx.type === 'CC_PAYMENT') &&
          tx.toAccountId === selectedCardFilter);
      const isOut =
        tx.type === 'EXPENSE' ||
        tx.type === 'LEND' ||
        (selectedCardFilter !== 'ALL' &&
          (tx.type === 'TRANSFER' || tx.type === 'CC_PAYMENT') &&
          tx.accountId === selectedCardFilter);

      if (isIn) bucket.totalIn += tx.amount;
      if (isOut) bucket.totalOut += tx.amount;
      bucket.items.push(tx);

      const cardId =
        selectedCardFilter !== 'ALL' && tx.toAccountId === selectedCardFilter
          ? tx.toAccountId
          : tx.accountId;
      const acc = accounts.find((a) => a.id === cardId);
      const cardName = acc?.name || (isBn ? 'অন্যান্য' : 'Other');
      const cardEntry = bucket.byCard.get(cardId) ?? {
        account: acc,
        cardName,
        inAmt: 0,
        outAmt: 0,
      };
      if (isIn) cardEntry.inAmt += tx.amount;
      if (isOut) cardEntry.outAmt += tx.amount;
      bucket.byCard.set(cardId, cardEntry);
    }

    const all = Array.from(map.values()).sort(
      (a, b) => b.totalOut + b.totalIn - (a.totalOut + a.totalIn)
    );
    if (selectedWayFilter !== 'ALL') {
      return all.filter((w) => w.name.toLowerCase() === selectedWayFilter.toLowerCase());
    }
    return all;
  }, [accounts, isBn, scopedMonthTransactions, selectedCardFilter, selectedWayFilter, wayNames]);

  const toggleWayExpand = (name: string) => {
    const key = name.toLowerCase();
    setExpandedWays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-5 pb-28 space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
            {isBn ? 'মাসিক রিপোর্ট' : 'Monthly Report'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isBn
              ? 'খাত ও ব্যাংক/কার্ড অনুযায়ী মাসিক ইন-আউট ও ব্যালেন্স'
              : 'Monthly spending, income & balance by way and card'}
          </p>
        </div>
      </header>

      {/* Month Switcher */}
      <TranslucentCard className="p-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => stepMonth(-1)}
          aria-label={isBn ? 'আগের মাস' : 'Previous month'}
          className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-sky-600 shrink-0" />
          <span className="text-base font-extrabold text-slate-900 dark:text-white">
            {formatMonthYear(selectedYear, selectedMonth0, settings.language)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => stepMonth(1)}
          aria-label={isBn ? 'পরের মাস' : 'Next month'}
          className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0"
        >
          <ChevronRight size={18} />
        </button>
      </TranslucentCard>

      {/* Monthly Overview Strip */}
      <div className="grid grid-cols-3 gap-2.5">
        <TranslucentCard className="p-3.5 sm:p-4">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {isBn ? 'এই মাসে মোট খরচ' : 'Total Spent'}
          </p>
          <p className="text-base sm:text-xl font-extrabold font-mono-num text-rose-600 dark:text-rose-400 mt-1 tabular-nums truncate">
            {formatCurrency(totals.totalOut, settings.currencySymbol, settings.language)}
          </p>
        </TranslucentCard>

        <TranslucentCard className="p-3.5 sm:p-4">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {isBn ? 'এই মাসে মোট ইন' : 'Total Received'}
          </p>
          <p className="text-base sm:text-xl font-extrabold font-mono-num text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums truncate">
            {formatCurrency(totals.totalIn, settings.currencySymbol, settings.language)}
          </p>
        </TranslucentCard>

        <TranslucentCard className="p-3.5 sm:p-4">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {isBn ? 'বর্তমানে আছে' : 'Available Now'}
          </p>
          <p className="text-base sm:text-xl font-extrabold font-mono-num text-slate-900 dark:text-white mt-1 tabular-nums truncate">
            {formatCurrency(totals.currentBalance, settings.currencySymbol, settings.language)}
          </p>
        </TranslucentCard>
      </div>

      {/* Card-by-Card Monthly Flow & Current Balance (Scrollable) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
            {isBn ? 'কার্ড / ব্যাংক অনুযায়ী হিসাব' : 'By Card & Bank'}
          </h2>
          {selectedCardFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedCardFilter('ALL')}
              className="text-xs font-bold text-sky-600 dark:text-sky-400"
            >
              {isBn ? 'সব কার্ড দেখুন' : 'Show All Cards'}
            </button>
          )}
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar snap-x">
          {cardBreakdown.map(({ account, inAmt, outAmt, count }) => {
            const active = selectedCardFilter === account.id;
            return (
              <button
                key={account.id}
                type="button"
                onClick={() => setSelectedCardFilter(active ? 'ALL' : account.id)}
                className={`min-w-[210px] sm:min-w-[230px] snap-start text-left rounded-2xl p-4 transition border ${
                  active
                    ? 'bg-sky-600 text-white border-sky-500 shadow-md'
                    : 'glass-card text-slate-900 dark:text-white border-slate-200/70 dark:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold truncate">{account.name}</span>
                  <span
                    className={`text-[11px] font-mono-num ${
                      active ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {localizeDigits(count, settings.language)} {isBn ? 'টি' : 'tx'}
                  </span>
                </div>

                <p
                  className={`text-lg font-black font-mono-num mt-1 tabular-nums ${
                    active ? 'text-white' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {formatCurrency(account.balance, settings.currencySymbol, settings.language)}
                </p>

                <div
                  className={`mt-2 pt-2 border-t flex items-center justify-between text-xs font-mono-num ${
                    active
                      ? 'border-white/20 text-white/90'
                      : 'border-slate-200/70 dark:border-white/10'
                  }`}
                >
                  <span className={active ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}>
                    {isBn ? 'ইন:' : 'In:'} +{formatCurrency(inAmt, settings.currencySymbol, settings.language)}
                  </span>
                  <span className={active ? 'text-rose-100' : 'text-rose-600 dark:text-rose-400'}>
                    {isBn ? 'আউট:' : 'Out:'} -{formatCurrency(outAmt, settings.currencySymbol, settings.language)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Scrollable Khath (Way of Spending/Income) Breakdown */}
      <section className="space-y-3">
        <div className="space-y-2">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
            {isBn ? 'খাত অনুযায়ী বিস্তারিত হিসাব (স্ক্রল করে দেখুন)' : 'Breakdown by Way / Subcategory'}
          </h2>

          {/* Interactive Khath Filter Bar */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedWayFilter('ALL')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedWayFilter === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'glass-card text-slate-600 dark:text-slate-300'
              }`}
            >
              {isBn ? 'সব খাত' : 'All Ways'}
            </button>
            {wayNames.map((name) => {
              const active = selectedWayFilter.toLowerCase() === name.toLowerCase();
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedWayFilter(active ? 'ALL' : name)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    active
                      ? 'bg-sky-600 text-white'
                      : 'glass-card text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Each Khath Card showing Total Out, Total In, and Per-Card/Bank Breakdown inside that Khath */}
        <div className="space-y-3">
          {khathReports.map((khath) => {
            const expanded = expandedWays.has(khath.name.toLowerCase());
            const cardEntries = Array.from(khath.byCard.values());

            return (
              <TranslucentCard key={khath.name} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleWayExpand(khath.name)}
                  className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/60 dark:hover:bg-white/5 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                        {khath.name}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                        · {localizeDigits(khath.items.length, settings.language)}{' '}
                        {isBn ? 'টি এন্ট্রি' : 'entries'}
                      </span>
                    </div>

                    {/* Which bank/card spent or received in this khath */}
                    {cardEntries.length > 0 ? (
                      <div className="mt-1.5 space-y-1">
                        {cardEntries.map((ce) => (
                          <p
                            key={ce.cardName}
                            className="text-xs text-slate-600 dark:text-slate-300 font-mono-num"
                          >
                            <span className="font-sans font-bold text-slate-800 dark:text-slate-200">
                              {ce.cardName}:
                            </span>{' '}
                            {ce.outAmt > 0 && (
                              <span className="text-rose-600 dark:text-rose-400">
                                {isBn ? 'খরচ' : 'Out'}{' '}
                                {formatCurrency(ce.outAmt, settings.currencySymbol, settings.language)}
                              </span>
                            )}
                            {ce.outAmt > 0 && ce.inAmt > 0 && <span aria-hidden="true"> · </span>}
                            {ce.inAmt > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {isBn ? 'জমা' : 'In'}{' '}
                                {formatCurrency(ce.inAmt, settings.currencySymbol, settings.language)}
                              </span>
                            )}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {isBn ? 'এই মাসে কোনো লেনদেন নেই' : 'No entries this month'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right font-mono-num tabular-nums">
                      <p className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                        -{formatCurrency(khath.totalOut, settings.currencySymbol, settings.language)}
                      </p>
                      {khath.totalIn > 0 && (
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(khath.totalIn, settings.currencySymbol, settings.language)}
                        </p>
                      )}
                    </div>
                    {khath.items.length > 0 && (
                      <span className="text-slate-400">
                        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </span>
                    )}
                  </div>
                </button>

                {expanded && khath.items.length > 0 && (
                  <div className="border-t border-slate-200/60 dark:border-white/10 divide-y divide-slate-200/50 dark:divide-white/5 bg-slate-50/50 dark:bg-black/15">
                    {khath.items.map((tx) => {
                      const acc = accounts.find((a) => a.id === tx.accountId);
                      const isIn =
                        tx.type === 'INCOME' ||
                        tx.type === 'BORROW' ||
                        (selectedCardFilter !== 'ALL' && tx.toAccountId === selectedCardFilter);

                      return (
                        <div
                          key={tx.id}
                          className="px-4 py-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {tx.title || khath.name}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              <span>{acc?.name || (isBn ? 'কার্ড' : 'Card')}</span>
                              <span aria-hidden="true"> · </span>
                              <span>
                                {formatShortDate(tx.timestamp, settings.language)},{' '}
                                {formatTime(tx.timestamp, settings.language)}
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-xs font-extrabold font-mono-num tabular-nums ${
                                isIn
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {isIn ? '+' : '-'}
                              {formatCurrency(tx.amount, settings.currencySymbol, settings.language)}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteTransaction(tx.id)}
                              aria-label={isBn ? 'মুছুন' : 'Delete'}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-500/10"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TranslucentCard>
            );
          })}
        </div>
      </section>
    </div>
  );
}
