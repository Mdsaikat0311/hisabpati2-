import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  Pin,
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
import {
  PERSONAL_SOURCE_ACCOUNT_ID,
  computePersonalExpenseSummary,
  isPersonalWayLabel,
} from '../utils/analytics';
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

  // All transactions in the selected month (used for Personal IN + OUT net summary)
  const monthTransactions = useMemo(
    () =>
      transactions
        .filter((tx) => tx.timestamp >= monthRange.start && tx.timestamp <= monthRange.end)
        .sort((a, b) => b.timestamp - a.timestamp),
    [monthRange, transactions]
  );

  // Expense transactions in the selected month
  const monthExpenses = useMemo(
    () =>
      monthTransactions.filter(
        (tx) => tx.type === 'EXPENSE' || tx.type === 'LEND'
      ),
    [monthTransactions]
  );

  const personalSummary = useMemo(
    () => computePersonalExpenseSummary(monthTransactions),
    [monthTransactions]
  );

  // Overall month spending (avoiding double counting Personal pool reallocations) & current available total
  const totals = useMemo(() => {
    const directOut = monthExpenses
      .filter((tx) => tx.accountId !== PERSONAL_SOURCE_ACCOUNT_ID)
      .reduce((sum, tx) => sum + tx.amount, 0);
    const excessReallocated = Math.max(
      0,
      personalSummary.reallocatedFromPersonal - personalSummary.takenForPersonal
    );
    const totalOut = Math.round((directOut + excessReallocated) * 100) / 100;
    const currentBalance = visibleAccounts
      .filter((a) => a.includeInTotal)
      .reduce((sum, a) => sum + a.balance, 0);

    return { totalOut, currentBalance };
  }, [monthExpenses, personalSummary, visibleAccounts]);

  // Build list of all khath names with Personal pinned first
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
    for (const tx of monthExpenses) {
      const label = (tx.subcategory || tx.category || (isBn ? 'অন্যান্য' : 'Other')).trim();
      if (label && !seen.has(label.toLowerCase())) {
        seen.add(label.toLowerCase());
        list.push(label);
      }
    }
    const personal = list.filter((name) => isPersonalWayLabel(name));
    const others = list.filter((name) => !isPersonalWayLabel(name));
    return [...personal, ...others];
  }, [isBn, monthExpenses, spendingWays]);

  // Personal IN transactions in selected month (accountId === PERSONAL_SOURCE_ACCOUNT_ID, INCOME/BORROW)
  const monthPersonalIns = useMemo(
    () =>
      monthTransactions.filter(
        (tx) =>
          tx.accountId === PERSONAL_SOURCE_ACCOUNT_ID &&
          (tx.type === 'INCOME' || tx.type === 'BORROW')
      ),
    [monthTransactions]
  );

  // Per-khath (Way) expense breakdown with card-by-card sub-totals inside each khath
  const khathReports = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        isPinnedPersonal: boolean;
        totalOut: number;
        addedIn: number;
        reallocatedOut: number;
        items: TransactionEntity[];
        byCard: Map<
          string,
          { account: AccountEntity | undefined; cardName: string; outAmt: number }
        >;
      }
    >();

    for (const name of wayNames) {
      map.set(name.toLowerCase(), {
        name,
        isPinnedPersonal: isPersonalWayLabel(name),
        totalOut: 0,
        addedIn: 0,
        reallocatedOut: 0,
        items: [],
        byCard: new Map(),
      });
    }

    for (const tx of monthExpenses) {
      const wayLabel = (tx.subcategory || tx.category || (isBn ? 'অন্যান্য' : 'Other')).trim();
      const key = wayLabel.toLowerCase();
      let bucket = map.get(key);
      if (!bucket) {
        bucket = {
          name: wayLabel,
          isPinnedPersonal: isPersonalWayLabel(wayLabel),
          totalOut: 0,
          addedIn: 0,
          reallocatedOut: 0,
          items: [],
          byCard: new Map(),
        };
        map.set(key, bucket);
      }

      bucket.totalOut += tx.amount;
      bucket.items.push(tx);

      const isPersonalPool = tx.accountId === PERSONAL_SOURCE_ACCOUNT_ID;
      const acc = isPersonalPool ? undefined : accounts.find((a) => a.id === tx.accountId);
      const cardName = isPersonalPool
        ? isBn
          ? 'পার্সোনাল থেকে'
          : 'From Personal'
        : acc?.name || (isBn ? 'অন্যান্য' : 'Other');
      const cardEntry = bucket.byCard.get(tx.accountId) ?? {
        account: acc,
        cardName,
        outAmt: 0,
      };
      cardEntry.outAmt += tx.amount;
      bucket.byCard.set(tx.accountId, cardEntry);
    }

    // Apply Personal IN additions & reallocation deductions to pinned Personal khath
    for (const bucket of map.values()) {
      if (bucket.isPinnedPersonal) {
        bucket.addedIn = personalSummary.addedToPersonal;
        bucket.reallocatedOut = personalSummary.reallocatedFromPersonal;
        if (monthPersonalIns.length > 0) {
          bucket.items = [...bucket.items, ...monthPersonalIns].sort(
            (a, b) => b.timestamp - a.timestamp
          );
        }
        bucket.totalOut = Math.max(
          0,
          Math.round(
            (bucket.totalOut +
              personalSummary.addedToPersonal -
              personalSummary.reallocatedFromPersonal) *
              100
          ) / 100
        );
      }
    }

    const all = Array.from(map.values()).sort((a, b) => {
      if (a.isPinnedPersonal !== b.isPinnedPersonal) {
        return a.isPinnedPersonal ? -1 : 1;
      }
      return b.totalOut - a.totalOut;
    });
    if (selectedWayFilter !== 'ALL') {
      return all.filter((w) => w.name.toLowerCase() === selectedWayFilter.toLowerCase());
    }
    return all;
  }, [
    accounts,
    isBn,
    monthExpenses,
    monthPersonalIns,
    personalSummary.addedToPersonal,
    personalSummary.reallocatedFromPersonal,
    selectedWayFilter,
    wayNames,
  ]);

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
            {isBn ? 'খরচের রিপোর্ট' : 'Expense Report'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isBn
              ? 'কোন খাতে কত টাকা খরচ হয়েছে তার মাসিক হিসাব'
              : 'Monthly breakdown of spending by category & way'}
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

      {/* Monthly Spending & Current Balance Strip */}
      <div className="grid grid-cols-2 gap-2.5">
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
            {isBn ? 'বর্তমানে আছে' : 'Available Now'}
          </p>
          <p className="text-base sm:text-xl font-extrabold font-mono-num text-slate-900 dark:text-white mt-1 tabular-nums truncate">
            {formatCurrency(totals.currentBalance, settings.currencySymbol, settings.language)}
          </p>
        </TranslucentCard>
      </div>

      {/* Scrollable Khath (Way of Spending) Breakdown */}
      <section className="space-y-3">
        <div className="space-y-2">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
            {isBn ? 'খাত অনুযায়ী খরচের হিসাব' : 'Spending by Way / Category'}
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

        {/* Each Khath Card showing Total Spent and Per-Card/Bank Expense Breakdown */}
        <div className="space-y-3">
          {khathReports.map((khath) => {
            const expanded = expandedWays.has(khath.name.toLowerCase());
            const cardEntries = Array.from(khath.byCard.values());

            return (
              <TranslucentCard
                key={khath.name}
                className={`overflow-hidden ${
                  khath.isPinnedPersonal
                    ? 'border border-amber-400/50 dark:border-amber-400/35 bg-amber-500/5'
                    : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleWayExpand(khath.name)}
                  className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/60 dark:hover:bg-white/5 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {khath.isPinnedPersonal && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold">
                          <Pin size={10} />
                          <span>{isBn ? 'পিন করা' : 'Pinned'}</span>
                        </span>
                      )}
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                        {khath.name}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                        · {localizeDigits(khath.items.length, settings.language)}{' '}
                        {isBn ? 'টি খরচ' : 'entries'}
                      </span>
                    </div>

                    {/* Which bank/card spent in this khath */}
                    {cardEntries.length > 0 || khath.addedIn > 0 || khath.reallocatedOut > 0 ? (
                      <div className="mt-1.5 space-y-1">
                        {cardEntries.map((ce) => (
                          <p
                            key={ce.cardName}
                            className="text-xs text-slate-600 dark:text-slate-300 font-mono-num"
                          >
                            <span className="font-sans font-bold text-slate-800 dark:text-slate-200">
                              {ce.cardName}:
                            </span>{' '}
                            <span className="text-rose-600 dark:text-rose-400">
                              {isBn ? 'খরচ' : 'Spent'}{' '}
                              {formatCurrency(ce.outAmt, settings.currencySymbol, settings.language)}
                            </span>
                          </p>
                        ))}
                        {khath.addedIn > 0 && (
                          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-mono-num">
                            <span className="font-sans font-bold">
                              {isBn ? 'পার্সোনালে ইন:' : 'Added to Personal:'}
                            </span>{' '}
                            <span>
                              +{formatCurrency(khath.addedIn, settings.currencySymbol, settings.language)}
                            </span>
                          </p>
                        )}
                        {khath.reallocatedOut > 0 && (
                          <p className="text-xs text-amber-700 dark:text-amber-300 font-mono-num">
                            <span className="font-sans font-bold">
                              {isBn ? 'অন্য খাতে ব্যবহার:' : 'Reallocated to other ways:'}
                            </span>{' '}
                            <span>
                              -{formatCurrency(khath.reallocatedOut, settings.currencySymbol, settings.language)}
                            </span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {isBn ? 'এই মাসে কোনো খরচ নেই' : 'No spending this month'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right font-mono-num tabular-nums">
                      <p
                        className={`text-sm font-extrabold ${
                          khath.isPinnedPersonal
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatCurrency(khath.totalOut, settings.currencySymbol, settings.language)}
                      </p>
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
                      const isPersonalPool = tx.accountId === PERSONAL_SOURCE_ACCOUNT_ID;
                      const acc = isPersonalPool
                        ? undefined
                        : accounts.find((a) => a.id === tx.accountId);
                      const sourceLabel = isPersonalPool
                        ? isBn
                          ? 'পার্সোনাল থেকে'
                          : 'From Personal'
                        : acc?.name || (isBn ? 'কার্ড' : 'Card');

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
                              <span>{sourceLabel}</span>
                              <span aria-hidden="true"> · </span>
                              <span>
                                {formatShortDate(tx.timestamp, settings.language)},{' '}
                                {formatTime(tx.timestamp, settings.language)}
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {(() => {
                              const isIn = tx.type === 'INCOME' || tx.type === 'BORROW';
                              return (
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
                              );
                            })()}
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
