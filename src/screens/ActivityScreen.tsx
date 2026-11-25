import React, { useMemo, useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  Trash2,
  Edit3,
  BarChart2,
  List,
  Plus,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import {
  formatCurrency,
  formatDateTime,
  formatDayHeader,
  formatTime,
} from '../utils/formatters';
import {
  buildCategoryBreakdown,
  isEligibleExpense,
  isEligibleIncome,
} from '../utils/analytics';
import { TranslucentCard } from '../components/GlassPrimitives';
import { CategoryIcon } from '../components/CategoryIcon';
import { AccountMiniBadge } from '../components/HishabPatiAccountCard';
import type { ActivityFilterState, TransactionEntity, TransactionType } from '../types/models';

const DEFAULT_FILTER: ActivityFilterState = {
  searchQuery: '',
  typeFilter: 'ALL',
  accountIds: [],
  categoryNames: [],
  datePreset: 'ALL',
  startDate: null,
  endDate: null,
  sortBy: 'NEWEST',
};

export function ActivityScreen() {
  const {
    transactions,
    accounts,
    categories,
    settings,
    openAddTransaction,
    deleteTransaction,
  } = useWallet();
  const isBn = settings.language === 'BANGLA';

  const [filter, setFilter] = useState<ActivityFilterState>(DEFAULT_FILTER);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [reportMode, setReportMode] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionEntity | null>(null);

  const dateRange = useMemo(() => {
    const now = new Date();
    if (filter.datePreset === 'THIS_MONTH') {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime(),
      };
    }
    if (filter.datePreset === 'LAST_MONTH') {
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime(),
      };
    }
    if (filter.datePreset === 'THIS_YEAR') {
      return {
        start: new Date(now.getFullYear(), 0, 1).getTime(),
        end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime(),
      };
    }
    if (filter.datePreset === 'CUSTOM' && (filter.startDate || filter.endDate)) {
      return {
        start: filter.startDate ?? 0,
        end: filter.endDate ?? Number.MAX_SAFE_INTEGER,
      };
    }
    return null;
  }, [filter.datePreset, filter.endDate, filter.startDate]);

  const filteredTransactions = useMemo(() => {
    const q = filter.searchQuery.trim().toLowerCase();
    return transactions
      .filter((tx) => {
        if (filter.typeFilter !== 'ALL' && tx.type !== filter.typeFilter) return false;
        if (
          filter.accountIds.length > 0 &&
          !filter.accountIds.includes(tx.accountId) &&
          !(tx.toAccountId && filter.accountIds.includes(tx.toAccountId))
        ) {
          return false;
        }
        if (
          filter.categoryNames.length > 0 &&
          !filter.categoryNames.some((c) => c.toLowerCase() === tx.category.toLowerCase())
        ) {
          return false;
        }
        if (dateRange && (tx.timestamp < dateRange.start || tx.timestamp > dateRange.end)) {
          return false;
        }
        if (q) {
          const hay = `${tx.title} ${tx.category} ${tx.subcategory} ${tx.notes} ${tx.payeeOrPayer}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (filter.sortBy === 'OLDEST') return a.timestamp - b.timestamp;
        if (filter.sortBy === 'HIGHEST') return b.amount - a.amount;
        if (filter.sortBy === 'LOWEST') return a.amount - b.amount;
        return b.timestamp - a.timestamp;
      });
  }, [dateRange, filter, transactions]);

  const groupedByDay = useMemo(() => {
    const groups: Array<{ dayLabel: string; items: TransactionEntity[] }> = [];
    const map = new Map<string, TransactionEntity[]>();
    for (const tx of filteredTransactions) {
      const label =
        filter.sortBy === 'HIGHEST' || filter.sortBy === 'LOWEST'
          ? t('summary', settings.language)
          : formatDayHeader(tx.timestamp, settings.language);
      const list = map.get(label) ?? [];
      list.push(tx);
      map.set(label, list);
    }
    for (const [dayLabel, items] of map.entries()) {
      groups.push({ dayLabel, items });
    }
    return groups;
  }, [filter.sortBy, filteredTransactions, settings.language]);

  const reportStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filteredTransactions) {
      if (isEligibleIncome(tx)) income += tx.amount;
      else if (isEligibleExpense(tx)) expense += tx.amount;
    }
    const breakdown = buildCategoryBreakdown(filteredTransactions, categories, 'EXPENSE');
    return { income, expense, net: income - expense, breakdown };
  }, [categories, filteredTransactions]);

  const activeFiltersCount =
    filter.accountIds.length +
    filter.categoryNames.length +
    (filter.datePreset !== 'ALL' ? 1 : 0);

  const typeTabs: Array<{ id: TransactionType | 'ALL'; label: string }> = [
    { id: 'ALL', label: t('all', settings.language) },
    { id: 'EXPENSE', label: t('expense', settings.language) },
    { id: 'INCOME', label: t('income', settings.language) },
    { id: 'TRANSFER', label: t('transfer', settings.language) },
    { id: 'LEND', label: t('receivable', settings.language) },
    { id: 'BORROW', label: t('payable', settings.language) },
    { id: 'CC_PAYMENT', label: isBn ? 'কার্ড পেমেন্ট' : 'CC Pay' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 pt-5 pb-28 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {t('nav_activity', settings.language)}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {filteredTransactions.length} {t('transactions_label', settings.language)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReportMode((v) => !v)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              reportMode
                ? 'bg-sky-600 text-white'
                : 'glass-card text-slate-700 dark:text-slate-200'
            }`}
          >
            {reportMode ? <List size={14} /> : <BarChart2 size={14} />}
            <span>{reportMode ? (isBn ? 'তালিকা' : 'List') : (isBn ? 'রিপোর্ট' : 'Summary')}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowFilterModal(true)}
            className="relative px-3 py-2 rounded-xl glass-card text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
          >
            <SlidersHorizontal size={14} />
            <span>{t('filter', settings.language)}</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-sky-600 text-white text-[10px] flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search + Sort Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filter.searchQuery}
            onChange={(e) => setFilter((f) => ({ ...f, searchQuery: e.target.value }))}
            placeholder={
              isBn
                ? 'শিরোনাম, নোট বা ক্যাটাগরি খুঁজুন...'
                : 'Search title, category, notes...'
            }
            className="w-full pl-9 pr-8 py-2.5 rounded-2xl glass-card text-sm text-slate-900 dark:text-white outline-none"
          />
          {filter.searchQuery && (
            <button
              type="button"
              onClick={() => setFilter((f) => ({ ...f, searchQuery: '' }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <select
          value={filter.sortBy}
          onChange={(e) =>
            setFilter((f) => ({
              ...f,
              sortBy: e.target.value as ActivityFilterState['sortBy'],
            }))
          }
          className="px-3 py-2.5 rounded-2xl glass-card text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
        >
          <option value="NEWEST">{t('sort_newest', settings.language)}</option>
          <option value="OLDEST">{t('sort_oldest', settings.language)}</option>
          <option value="HIGHEST">{t('sort_highest', settings.language)}</option>
          <option value="LOWEST">{t('sort_lowest', settings.language)}</option>
        </select>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {typeTabs.map((tab) => {
          const active = filter.typeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter((f) => ({ ...f, typeFilter: tab.id }))}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                active
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'glass-card text-slate-600 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Report Summary View OR Grouped Transaction List */}
      {reportMode ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2.5">
            <TranslucentCard className="p-3.5">
              <p className="text-[11px] text-slate-500">{t('money_in', settings.language)}</p>
              <p className="text-sm font-extrabold font-mono-num text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(reportStats.income, settings.currencySymbol, settings.language)}
              </p>
            </TranslucentCard>
            <TranslucentCard className="p-3.5">
              <p className="text-[11px] text-slate-500">{t('money_out', settings.language)}</p>
              <p className="text-sm font-extrabold font-mono-num text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(reportStats.expense, settings.currencySymbol, settings.language)}
              </p>
            </TranslucentCard>
            <TranslucentCard className="p-3.5">
              <p className="text-[11px] text-slate-500">{t('net', settings.language)}</p>
              <p className="text-sm font-extrabold font-mono-num text-slate-900 dark:text-white mt-1">
                {formatCurrency(reportStats.net, settings.currencySymbol, settings.language, true)}
              </p>
            </TranslucentCard>
          </div>

          <TranslucentCard className="p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('category_breakdown', settings.language)}
            </h3>
            {reportStats.breakdown.length === 0 ? (
              <p className="text-xs text-slate-500">{t('no_transactions_found', settings.language)}</p>
            ) : (
              reportStats.breakdown.map((item) => (
                <div key={item.categoryName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {isBn ? item.categoryNameBn : item.categoryName} ({item.count})
                    </span>
                    <span className="font-mono-num font-bold">
                      {formatCurrency(item.amount, settings.currencySymbol, settings.language)} (
                      {Math.round(item.percentage)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, item.percentage)}%`,
                        backgroundColor: item.colorHex,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </TranslucentCard>
        </div>
      ) : groupedByDay.length === 0 ? (
        <TranslucentCard className="p-8 text-center space-y-3">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {t('no_transactions_found', settings.language)}
          </p>
          <button
            type="button"
            onClick={() => openAddTransaction()}
            className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold inline-flex items-center gap-1"
          >
            <Plus size={14} /> {t('add', settings.language)}
          </button>
        </TranslucentCard>
      ) : (
        <div className="space-y-4">
          {groupedByDay.map((group) => (
            <div key={group.dayLabel} className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                {group.dayLabel}
              </p>
              <TranslucentCard className="divide-y divide-slate-200/60 dark:divide-white/10">
                {group.items.map((tx) => {
                  const cat = categories.find(
                    (c) => c.name.toLowerCase() === tx.category.toLowerCase()
                  );
                  const fromAcc = accounts.find((a) => a.id === tx.accountId);
                  const toAcc = tx.toAccountId
                    ? accounts.find((a) => a.id === tx.toAccountId)
                    : undefined;
                  const isIn = tx.type === 'INCOME' || tx.type === 'BORROW';
                  const isTr = tx.type === 'TRANSFER' || tx.type === 'CC_PAYMENT';

                  return (
                    <div
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-white/5 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CategoryIcon
                          iconName={cat?.iconName || (isTr ? 'swap_horiz' : 'category')}
                          colorHex={cat?.colorHex || (isIn ? '#10B981' : '#0284C7')}
                          size={42}
                          iconSize={19}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {tx.title || (isBn && cat?.nameBn ? cat.nameBn : tx.category)}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {fromAcc?.name || t('account', settings.language)}
                            {toAcc ? ` → ${toAcc.name}` : ''}
                            {tx.subcategory ? ` • ${tx.subcategory}` : ''} •{' '}
                            {formatTime(tx.timestamp, settings.language)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-sm font-extrabold font-mono-num shrink-0 ${
                          isIn
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isTr
                            ? 'text-sky-600 dark:text-sky-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isIn ? '+' : isTr ? '' : '-'}
                        {formatCurrency(tx.amount, settings.currencySymbol, settings.language)}
                      </span>
                    </div>
                  );
                })}
              </TranslucentCard>
            </div>
          ))}
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('filter', settings.language)}
              </h3>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Date preset */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-slate-500">
                  {t('filter_date_range', settings.language)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['ALL', t('all_time', settings.language)],
                      ['THIS_MONTH', t('this_month', settings.language)],
                      ['LAST_MONTH', t('last_month', settings.language)],
                      ['THIS_YEAR', t('this_year', settings.language)],
                      ['CUSTOM', t('custom_range', settings.language)],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFilter((f) => ({ ...f, datePreset: id }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                        filter.datePreset === id
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {filter.datePreset === 'CUSTOM' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <input
                      type="date"
                      value={
                        filter.startDate
                          ? new Date(filter.startDate).toISOString().slice(0, 10)
                          : ''
                      }
                      onChange={(e) =>
                        setFilter((f) => ({
                          ...f,
                          startDate: e.target.value ? new Date(e.target.value).getTime() : null,
                        }))
                      }
                      className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs"
                    />
                    <input
                      type="date"
                      value={
                        filter.endDate ? new Date(filter.endDate).toISOString().slice(0, 10) : ''
                      }
                      onChange={(e) =>
                        setFilter((f) => ({
                          ...f,
                          endDate: e.target.value
                            ? new Date(e.target.value).getTime() + 86_399_000
                            : null,
                        }))
                      }
                      className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Accounts Filter */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-slate-500">
                  {t('filter_account', settings.language)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {accounts.map((acc) => {
                    const selected = filter.accountIds.includes(acc.id);
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() =>
                          setFilter((f) => ({
                            ...f,
                            accountIds: selected
                              ? f.accountIds.filter((id) => id !== acc.id)
                              : [...f.accountIds, acc.id],
                          }))
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                          selected
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {acc.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-slate-500">
                  {t('filter_category', settings.language)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => {
                    const selected = filter.categoryNames.includes(cat.name);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() =>
                          setFilter((f) => ({
                            ...f,
                            categoryNames: selected
                              ? f.categoryNames.filter((n) => n !== cat.name)
                              : [...f.categoryNames, cat.name],
                          }))
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                          selected
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {isBn && cat.nameBn ? cat.nameBn : cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 dark:border-white/10 flex gap-2">
              <button
                type="button"
                onClick={() => setFilter(DEFAULT_FILTER)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
              >
                {t('reset_filters', settings.language)}
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold"
              >
                {t('apply_filters', settings.language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Sheet */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 text-xs font-bold">
                {selectedTx.type}
              </span>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-center space-y-1 py-2">
              <p className="text-3xl font-black font-mono-num text-slate-900 dark:text-white">
                {formatCurrency(selectedTx.amount, settings.currencySymbol, settings.language)}
              </p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                {selectedTx.title || selectedTx.category}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatDateTime(selectedTx.timestamp, settings.language)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{t('category', settings.language)}</span>
                <span className="font-bold">
                  {selectedTx.category}
                  {selectedTx.subcategory ? ` • ${selectedTx.subcategory}` : ''}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{t('account', settings.language)}</span>
                <AccountMiniBadge account={accounts.find((a) => a.id === selectedTx.accountId)} />
              </div>
              {selectedTx.toAccountId && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">{t('to_wallet', settings.language)}</span>
                  <AccountMiniBadge
                    account={accounts.find((a) => a.id === selectedTx.toAccountId)}
                  />
                </div>
              )}
              {selectedTx.payeeOrPayer && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">{isBn ? 'প্রাপক/প্রদানকারী' : 'Party'}</span>
                  <span className="font-semibold">{selectedTx.payeeOrPayer}</span>
                </div>
              )}
              {selectedTx.notes && (
                <div>
                  <span className="text-slate-500 block mb-0.5">{t('notes', settings.language)}</span>
                  <p className="text-slate-700 dark:text-slate-200">{selectedTx.notes}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const id = selectedTx.id;
                  setSelectedTx(null);
                  deleteTransaction(id);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Trash2 size={14} /> {t('delete', settings.language)}
              </button>
              <button
                type="button"
                onClick={() => {
                  const tx = selectedTx;
                  setSelectedTx(null);
                  openAddTransaction({ editingTx: tx });
                }}
                className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Edit3 size={14} /> {t('edit', settings.language)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
