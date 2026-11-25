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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Calendar,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import { QUICK_SUBCATEGORY_PRESETS } from '../data/initialData';
import {
  formatCurrency,
  formatDateTime,
  formatDayHeader,
  formatMonthYear,
  formatTime,
  localizeDigits,
} from '../utils/formatters';
import {
  buildCategoryBreakdown,
  isEligibleExpense,
  isEligibleIncome,
} from '../utils/analytics';
import { TranslucentCard } from '../components/GlassPrimitives';
import { CategoryIcon } from '../components/CategoryIcon';
import { AccountMiniBadge } from '../components/HishabPatiAccountCard';
import type {
  AccountEntity,
  ActivityFilterState,
  CategoryEntity,
  SubcategoryEntity,
  TransactionEntity,
  TransactionType,
} from '../types/models';

type ActivityViewMode = 'SUBCATEGORY' | 'LIST' | 'REPORT';
type FlowDirectionFilter = 'ALL' | 'IN' | 'OUT' | 'TRANSFER';

const DEFAULT_FILTER: ActivityFilterState = {
  searchQuery: '',
  typeFilter: 'ALL',
  accountIds: [],
  categoryNames: [],
  datePreset: 'THIS_MONTH',
  startDate: null,
  endDate: null,
  sortBy: 'NEWEST',
};

function getTxFlowForContext(
  tx: TransactionEntity,
  focusedAccountId: string | null
): 'IN' | 'OUT' | 'TRANSFER' {
  if (tx.type === 'INCOME' || tx.type === 'BORROW') return 'IN';
  if (tx.type === 'EXPENSE' || tx.type === 'LEND') return 'OUT';
  if (tx.type === 'TRANSFER' || tx.type === 'CC_PAYMENT') {
    if (focusedAccountId) {
      if (tx.toAccountId === focusedAccountId && tx.accountId !== focusedAccountId) return 'IN';
      if (tx.accountId === focusedAccountId && tx.toAccountId !== focusedAccountId) return 'OUT';
    }
    return 'TRANSFER';
  }
  return 'OUT';
}

function resolveSubcategoryGroup(
  tx: TransactionEntity,
  categories: CategoryEntity[],
  subcategories: SubcategoryEntity[],
  isBn: boolean
): { key: string; label: string; rawForNew: string } {
  const rawSub = (tx.subcategory || '').trim();
  if (rawSub) {
    const preset = QUICK_SUBCATEGORY_PRESETS.find(
      (p) => p.name.toLowerCase() === rawSub.toLowerCase() || p.nameBn === rawSub
    );
    if (preset) {
      return {
        key: `preset:${preset.name.toLowerCase()}`,
        label: isBn ? preset.nameBn : preset.name,
        rawForNew: isBn ? preset.nameBn : preset.name,
      };
    }
    const subCatalog = subcategories.find(
      (s) => s.name.toLowerCase() === rawSub.toLowerCase() || s.nameBn === rawSub
    );
    if (subCatalog) {
      return {
        key: `sub:${subCatalog.name.toLowerCase()}`,
        label: isBn && subCatalog.nameBn ? subCatalog.nameBn : subCatalog.name,
        rawForNew: isBn && subCatalog.nameBn ? subCatalog.nameBn : subCatalog.name,
      };
    }
    return {
      key: `custom:${rawSub.toLowerCase()}`,
      label: rawSub,
      rawForNew: rawSub,
    };
  }

  const cat = categories.find((c) => c.name.toLowerCase() === tx.category.toLowerCase());
  const catLabel = isBn && cat?.nameBn ? cat.nameBn : tx.category || (isBn ? 'সাধারণ' : 'General');
  return {
    key: `cat:${(tx.category || 'general').toLowerCase()}`,
    label: catLabel,
    rawForNew: catLabel,
  };
}

export function ActivityScreen() {
  const {
    transactions,
    accounts,
    categories,
    subcategories,
    settings,
    openAddTransaction,
    deleteTransaction,
  } = useWallet();
  const isBn = settings.language === 'BANGLA';

  const now = useMemo(() => new Date(), []);
  const [monthMode, setMonthMode] = useState<'MONTH' | 'ALL'>('MONTH');
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth0, setSelectedMonth0] = useState<number>(now.getMonth());

  const [viewMode, setViewMode] = useState<ActivityViewMode>('SUBCATEGORY');
  const [flowFilter, setFlowFilter] = useState<FlowDirectionFilter>('ALL');
  const [selectedSubFilter, setSelectedSubFilter] = useState<string>('ALL');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const [filter, setFilter] = useState<ActivityFilterState>(DEFAULT_FILTER);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionEntity | null>(null);

  const visibleAccounts = useMemo(
    () => accounts.filter((a) => !a.isHidden).sort((a, b) => a.sortOrder - b.sortOrder),
    [accounts]
  );

  const singleSelectedAccountId =
    filter.accountIds.length === 1 ? filter.accountIds[0] : null;
  const singleSelectedAccount = useMemo(
    () =>
      singleSelectedAccountId
        ? accounts.find((a) => a.id === singleSelectedAccountId) ?? null
        : null,
    [accounts, singleSelectedAccountId]
  );

  const stepMonth = (delta: number) => {
    setMonthMode('MONTH');
    if (filter.datePreset === 'CUSTOM') {
      setFilter((f) => ({ ...f, datePreset: 'THIS_MONTH', startDate: null, endDate: null }));
    }
    const d = new Date(selectedYear, selectedMonth0 + delta, 1);
    setSelectedYear(d.getFullYear());
    setSelectedMonth0(d.getMonth());
  };

  const dateRange = useMemo(() => {
    if (filter.datePreset === 'CUSTOM' && (filter.startDate || filter.endDate)) {
      return {
        start: filter.startDate ?? 0,
        end: filter.endDate ?? Number.MAX_SAFE_INTEGER,
      };
    }
    if (monthMode === 'ALL') {
      if (filter.datePreset === 'THIS_YEAR') {
        return {
          start: new Date(now.getFullYear(), 0, 1).getTime(),
          end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime(),
        };
      }
      return null;
    }
    return {
      start: new Date(selectedYear, selectedMonth0, 1, 0, 0, 0, 0).getTime(),
      end: new Date(selectedYear, selectedMonth0 + 1, 0, 23, 59, 59, 999).getTime(),
    };
  }, [filter.datePreset, filter.endDate, filter.startDate, monthMode, now, selectedMonth0, selectedYear]);

  // Base month/card/search/category filtered list (before flow/subcategory chip)
  const baseFilteredTransactions = useMemo(() => {
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
          const fromAccName = accounts.find((a) => a.id === tx.accountId)?.name || '';
          const toAccName = tx.toAccountId
            ? accounts.find((a) => a.id === tx.toAccountId)?.name || ''
            : '';
          const hay = `${tx.title} ${tx.category} ${tx.subcategory} ${tx.notes} ${tx.payeeOrPayer} ${fromAccName} ${toAccName}`.toLowerCase();
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
  }, [accounts, dateRange, filter, transactions]);

  // Apply flow filter (ALL / IN / OUT / TRANSFER)
  const flowFilteredTransactions = useMemo(() => {
    if (flowFilter === 'ALL') return baseFilteredTransactions;
    return baseFilteredTransactions.filter((tx) => {
      const flow = getTxFlowForContext(tx, singleSelectedAccountId);
      if (flowFilter === 'TRANSFER') {
        return tx.type === 'TRANSFER' || tx.type === 'CC_PAYMENT';
      }
      return flow === flowFilter;
    });
  }, [baseFilteredTransactions, flowFilter, singleSelectedAccountId]);

  // Available subcategory filter chips in current filtered set + core presets
  const subcategoryChipOptions = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number }>();
    for (const p of QUICK_SUBCATEGORY_PRESETS.slice(0, 3)) {
      map.set(`preset:${p.name.toLowerCase()}`, {
        key: `preset:${p.name.toLowerCase()}`,
        label: isBn ? p.nameBn : p.name,
        count: 0,
      });
    }
    for (const tx of flowFilteredTransactions) {
      const info = resolveSubcategoryGroup(tx, categories, subcategories, isBn);
      const cur = map.get(info.key);
      if (cur) {
        cur.count += 1;
      } else {
        map.set(info.key, { key: info.key, label: info.label, count: 1 });
      }
    }
    return Array.from(map.values()).filter(
      (item) => item.count > 0 || item.key.startsWith('preset:')
    );
  }, [categories, flowFilteredTransactions, isBn, subcategories]);

  const filteredTransactions = useMemo(() => {
    if (viewMode !== 'SUBCATEGORY' || selectedSubFilter === 'ALL') {
      return flowFilteredTransactions;
    }
    return flowFilteredTransactions.filter((tx) => {
      const info = resolveSubcategoryGroup(tx, categories, subcategories, isBn);
      return info.key === selectedSubFilter;
    });
  }, [categories, flowFilteredTransactions, isBn, selectedSubFilter, subcategories, viewMode]);

  // Monthly / filtered cashflow summary (card-aware when single card selected)
  const periodFlowStats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let transferVolume = 0;
    for (const tx of flowFilteredTransactions) {
      const flow = getTxFlowForContext(tx, singleSelectedAccountId);
      if (flow === 'IN') totalIn += tx.amount;
      else if (flow === 'OUT') totalOut += tx.amount;
      else transferVolume += tx.amount;
    }
    return {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      transferVolume,
    };
  }, [flowFilteredTransactions, singleSelectedAccountId]);

  // Grouped by day for LIST mode
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

  // Grouped by Subcategory for SUBCATEGORY mode
  const subcategoryGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        label: string;
        rawForNew: string;
        totalIn: number;
        totalOut: number;
        transferVol: number;
        items: TransactionEntity[];
        byCard: Map<string, { account: AccountEntity | undefined; name: string; inAmt: number; outAmt: number }>;
      }
    >();

    for (const tx of filteredTransactions) {
      const info = resolveSubcategoryGroup(tx, categories, subcategories, isBn);
      let entry = map.get(info.key);
      if (!entry) {
        entry = {
          key: info.key,
          label: info.label,
          rawForNew: info.rawForNew,
          totalIn: 0,
          totalOut: 0,
          transferVol: 0,
          items: [],
          byCard: new Map(),
        };
        map.set(info.key, entry);
      }
      entry.items.push(tx);

      const flow = getTxFlowForContext(tx, singleSelectedAccountId);
      if (flow === 'IN') entry.totalIn += tx.amount;
      else if (flow === 'OUT') entry.totalOut += tx.amount;
      else entry.transferVol += tx.amount;

      // Track card attribution
      const relevantAccId =
        singleSelectedAccountId && tx.toAccountId === singleSelectedAccountId
          ? tx.toAccountId
          : tx.accountId;
      const acc = accounts.find((a) => a.id === relevantAccId);
      const cardName = acc?.name || (isBn ? 'অন্যান্য' : 'Other');
      const cardBucket = entry.byCard.get(relevantAccId) ?? {
        account: acc,
        name: cardName,
        inAmt: 0,
        outAmt: 0,
      };
      if (flow === 'IN') cardBucket.inAmt += tx.amount;
      else if (flow === 'OUT') cardBucket.outAmt += tx.amount;
      entry.byCard.set(relevantAccId, cardBucket);
    }

    return Array.from(map.values()).sort(
      (a, b) => b.totalOut + b.totalIn + b.transferVol - (a.totalOut + a.totalIn + a.transferVol)
    );
  }, [accounts, categories, filteredTransactions, isBn, singleSelectedAccountId, subcategories]);

  // Card-wise monthly stats & Category breakdown for REPORT mode
  const reportStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filteredTransactions) {
      if (isEligibleIncome(tx)) income += tx.amount;
      else if (isEligibleExpense(tx)) expense += tx.amount;
    }
    const expenseBreakdown = buildCategoryBreakdown(filteredTransactions, categories, 'EXPENSE');
    const incomeBreakdown = buildCategoryBreakdown(filteredTransactions, categories, 'INCOME');

    const perCard = visibleAccounts.map((acc) => {
      let cardIn = 0;
      let cardOut = 0;
      let count = 0;
      for (const tx of baseFilteredTransactions) {
        if (tx.accountId !== acc.id && tx.toAccountId !== acc.id) continue;
        count += 1;
        if (tx.accountId === acc.id) {
          if (tx.type === 'INCOME' || tx.type === 'BORROW') cardIn += tx.amount;
          else cardOut += tx.amount;
        }
        if (tx.toAccountId === acc.id && (tx.type === 'TRANSFER' || tx.type === 'CC_PAYMENT')) {
          cardIn += tx.amount;
        }
      }
      return {
        account: acc,
        cardIn,
        cardOut,
        net: cardIn - cardOut,
        count,
      };
    });

    return { income, expense, net: income - expense, expenseBreakdown, incomeBreakdown, perCard };
  }, [baseFilteredTransactions, categories, filteredTransactions, visibleAccounts]);

  const activeFiltersCount =
    filter.accountIds.length +
    filter.categoryNames.length +
    (filter.typeFilter !== 'ALL' ? 1 : 0) +
    (filter.datePreset === 'CUSTOM' ? 1 : 0);

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderTransactionRow = (tx: TransactionEntity) => {
    const cat = categories.find((c) => c.name.toLowerCase() === tx.category.toLowerCase());
    const fromAcc = accounts.find((a) => a.id === tx.accountId);
    const toAcc = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId) : undefined;
    const flow = getTxFlowForContext(tx, singleSelectedAccountId);
    const isIn = flow === 'IN';
    const isTr = flow === 'TRANSFER';

    const flowBadge = isIn
      ? isBn
        ? 'ইন'
        : 'IN'
      : isTr
      ? isBn
        ? 'ট্রান্সফার'
        : 'TR'
      : isBn
      ? 'আউট'
      : 'OUT';

    const subDisplay = resolveSubcategoryGroup(tx, categories, subcategories, isBn).label;

    return (
      <div
        key={tx.id}
        onClick={() => setSelectedTx(tx)}
        className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-white/5 transition min-h-[60px]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <CategoryIcon
            iconName={cat?.iconName || (isTr ? 'swap_horiz' : 'category')}
            colorHex={cat?.colorHex || (isIn ? '#10B981' : isTr ? '#0284C7' : '#F43F5E')}
            size={42}
            iconSize={19}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {tx.title || (isBn && cat?.nameBn ? cat.nameBn : tx.category)}
              </p>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ${
                  isIn
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : isTr
                    ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                }`}
              >
                {flowBadge}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {fromAcc?.name || t('account', settings.language)}
                {toAcc ? ` → ${toAcc.name}` : ''}
              </span>
              {` • ${subDisplay} • ${formatTime(tx.timestamp, settings.language)}`}
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
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-5 pb-28 space-y-4">
      {/* Header + 3-way View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {isBn ? 'মাসিক হিসাব ও অ্যাক্টিভিটি' : t('nav_activity', settings.language)}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {localizeDigits(filteredTransactions.length, settings.language)}{' '}
            {t('transactions_label', settings.language)}
            {singleSelectedAccount ? ` • ${singleSelectedAccount.name}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilterModal(true)}
            className="relative min-h-[40px] px-3 py-2 rounded-xl glass-card text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
          >
            <SlidersHorizontal size={14} />
            <span>{t('filter', settings.language)}</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-sky-600 text-white text-[10px] flex items-center justify-center">
                {localizeDigits(activeFiltersCount, settings.language)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Month-by-Month Selector Bar */}
      <TranslucentCard className="p-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => stepMonth(-1)}
          aria-label={isBn ? 'আগের মাস' : 'Previous month'}
          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <Calendar size={15} className="text-sky-600 shrink-0" />
          <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
            {monthMode === 'ALL'
              ? isBn
                ? 'সকল মাসের হিসাব'
                : 'All Months'
              : formatMonthYear(selectedYear, selectedMonth0, settings.language)}
          </span>
          <button
            type="button"
            onClick={() => {
              if (monthMode === 'ALL') {
                setMonthMode('MONTH');
              } else {
                setMonthMode('ALL');
              }
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition shrink-0 ${
              monthMode === 'ALL'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {monthMode === 'ALL'
              ? isBn
                ? 'মাস অনুযায়ী'
                : 'By Month'
              : isBn
              ? 'সব মাস'
              : 'All Months'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => stepMonth(1)}
          aria-label={isBn ? 'পরের মাস' : 'Next month'}
          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0"
        >
          <ChevronRight size={18} />
        </button>
      </TranslucentCard>

      {/* Card Quick Selector Strip */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFilter((f) => ({ ...f, accountIds: [] }))}
          className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
            filter.accountIds.length === 0
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
              : 'glass-card text-slate-700 dark:text-slate-200'
          }`}
        >
          <span>{isBn ? 'সব কার্ড' : 'All Cards'}</span>
        </button>
        {visibleAccounts.map((acc) => {
          const active = filter.accountIds.length === 1 && filter.accountIds[0] === acc.id;
          return (
            <button
              key={acc.id}
              type="button"
              onClick={() =>
                setFilter((f) => ({
                  ...f,
                  accountIds: active ? [] : [acc.id],
                }))
              }
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
                active
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'glass-card text-slate-700 dark:text-slate-200'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: active ? '#FFFFFF' : acc.colorHex }}
              />
              <span>{acc.name}</span>
              <span
                className={`font-mono-num text-[11px] ${
                  active ? 'text-white/85' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {formatCurrency(acc.balance, settings.currencySymbol, settings.language)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Monthly Cashflow Summary + Quick In/Out Actions */}
      <div className="grid grid-cols-3 gap-2.5">
        <TranslucentCard className="p-3.5">
          <div className="flex items-center justify-between gap-1">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {singleSelectedAccount
                ? isBn
                  ? 'কার্ডে ইন (ঢুকেছে)'
                  : 'Card In'
                : isBn
                ? 'মোট ইন (ঢুকেছে)'
                : 'Total In'}
            </p>
            <ArrowDownLeft size={14} className="text-emerald-500 shrink-0" />
          </div>
          <p className="text-base sm:text-lg font-extrabold font-mono-num text-emerald-600 dark:text-emerald-400 mt-1 truncate">
            +{formatCurrency(periodFlowStats.totalIn, settings.currencySymbol, settings.language)}
          </p>
        </TranslucentCard>

        <TranslucentCard className="p-3.5">
          <div className="flex items-center justify-between gap-1">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {singleSelectedAccount
                ? isBn
                  ? 'কার্ড থেকে আউট'
                  : 'Card Out'
                : isBn
                ? 'মোট আউট (বের)'
                : 'Total Out'}
            </p>
            <ArrowUpRight size={14} className="text-rose-500 shrink-0" />
          </div>
          <p className="text-base sm:text-lg font-extrabold font-mono-num text-rose-600 dark:text-rose-400 mt-1 truncate">
            -{formatCurrency(periodFlowStats.totalOut, settings.currencySymbol, settings.language)}
          </p>
        </TranslucentCard>

        <TranslucentCard className="p-3.5">
          <div className="flex items-center justify-between gap-1">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {isBn ? 'নিট হিসাব' : 'Net Flow'}
            </p>
            <ArrowLeftRight size={14} className="text-sky-500 shrink-0" />
          </div>
          <p
            className={`text-base sm:text-lg font-extrabold font-mono-num mt-1 truncate ${
              periodFlowStats.net >= 0
                ? 'text-slate-900 dark:text-white'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(periodFlowStats.net, settings.currencySymbol, settings.language, true)}
          </p>
        </TranslucentCard>
      </div>

      {/* View Mode Switcher + Quick In/Out Entry */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-2xl glass-card p-1 gap-1">
          {(
            [
              { id: 'SUBCATEGORY', label: isBn ? 'সাব-ক্যাটাগরি' : 'Subcategories', icon: Layers },
              { id: 'LIST', label: isBn ? 'তালিকা' : 'List', icon: List },
              { id: 'REPORT', label: isBn ? 'রিপোর্ট' : 'Report', icon: BarChart2 },
            ] as const
          ).map((mode) => {
            const Icon = mode.icon;
            const active = viewMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setViewMode(mode.id)}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  active
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-white/5'
                }`}
              >
                <Icon size={14} />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              openAddTransaction({
                initialType: 'INCOME',
                preselectedAccountId: singleSelectedAccountId ?? undefined,
              })
            }
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
          >
            <Plus size={14} />
            <span>{isBn ? 'টাকা ইন' : 'Money In'}</span>
          </button>
          <button
            type="button"
            onClick={() =>
              openAddTransaction({
                initialType: 'EXPENSE',
                preselectedAccountId: singleSelectedAccountId ?? undefined,
              })
            }
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
          >
            <Plus size={14} />
            <span>{isBn ? 'টাকা আউট' : 'Money Out'}</span>
          </button>
        </div>
      </div>

      {/* Flow Direction Filter + Search + Sort */}
      <div className="space-y-2.5">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {(
            [
              { id: 'ALL', label: isBn ? 'সব লেনদেন' : 'All Flow' },
              { id: 'IN', label: isBn ? 'ইন / ঢুকেছে' : 'In / Received' },
              { id: 'OUT', label: isBn ? 'আউট / বের হয়েছে' : 'Out / Spent' },
              { id: 'TRANSFER', label: isBn ? 'ভিতরে-বাইরে (ট্রান্সফার)' : 'Internal Transfer' },
            ] as const
          ).map((tab) => {
            const active = flowFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFlowFilter(tab.id)}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  active
                    ? tab.id === 'IN'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : tab.id === 'OUT'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-sky-600 text-white shadow-sm'
                    : 'glass-card text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filter.searchQuery}
              onChange={(e) => setFilter((f) => ({ ...f, searchQuery: e.target.value }))}
              placeholder={
                isBn
                  ? 'শিরোনাম, কার্ড, সাব-ক্যাটাগরি খুঁজুন...'
                  : 'Search title, card, subcategory...'
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
      </div>

      {/* VIEW 1: SUBCATEGORY LEDGER */}
      {viewMode === 'SUBCATEGORY' && (
        <div className="space-y-3">
          {/* Quick Subcategory Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedSubFilter('ALL')}
              className={`min-h-[34px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedSubFilter === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'glass-card text-slate-600 dark:text-slate-300'
              }`}
            >
              {isBn ? 'সব সাব-ক্যাটাগরি' : 'All Subcategories'}
            </button>
            {subcategoryChipOptions.map((chip) => {
              const active = selectedSubFilter === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setSelectedSubFilter(active ? 'ALL' : chip.key)}
                  className={`min-h-[34px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                    active
                      ? 'bg-sky-600 text-white'
                      : 'glass-card text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span>{chip.label}</span>
                  {chip.count > 0 && (
                    <span
                      className={`text-[10px] font-mono-num px-1.5 py-0.2 rounded-md ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {localizeDigits(chip.count, settings.language)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {subcategoryGroups.length === 0 ? (
            <TranslucentCard className="p-8 text-center space-y-3">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {t('no_transactions_found', settings.language)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isBn
                  ? 'পার্সোনাল, ফ্যামিলি বা বিজনেস সাব-ক্যাটাগরিতে নতুন লেনদেন যোগ করুন।'
                  : 'Add a transaction under Personal, Family, or Business subcategories.'}
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {QUICK_SUBCATEGORY_PRESETS.slice(0, 3).map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() =>
                      openAddTransaction({
                        initialType: 'EXPENSE',
                        preselectedAccountId: singleSelectedAccountId ?? undefined,
                        initialSubcategory: isBn ? preset.nameBn : preset.name,
                        initialCategory: preset.defaultExpenseCategory,
                      })
                    }
                    className="px-3.5 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold inline-flex items-center gap-1"
                  >
                    <Plus size={13} />
                    <span>{isBn ? preset.nameBn : preset.name}</span>
                  </button>
                ))}
              </div>
            </TranslucentCard>
          ) : (
            subcategoryGroups.map((group) => {
              const isCollapsed = collapsedGroups.has(group.key);
              const cardEntries = Array.from(group.byCard.values());

              return (
                <TranslucentCard key={group.key} className="overflow-hidden">
                  <div className="p-4 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60 dark:bg-white/[0.03] border-b border-slate-200/50 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => toggleGroupCollapse(group.key)}
                      className="flex items-center gap-2.5 text-left min-w-0 flex-1"
                    >
                      <span className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                            {group.label}
                          </h3>
                          <span className="text-[11px] font-mono-num px-2 py-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {localizeDigits(group.items.length, settings.language)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] mt-0.5">
                          {group.totalIn > 0 && (
                            <span className="font-mono-num font-bold text-emerald-600 dark:text-emerald-400">
                              {isBn ? 'ইন:' : 'In:'} +
                              {formatCurrency(group.totalIn, settings.currencySymbol, settings.language)}
                            </span>
                          )}
                          {group.totalOut > 0 && (
                            <span className="font-mono-num font-bold text-rose-600 dark:text-rose-400">
                              {isBn ? 'আউট:' : 'Out:'} -
                              {formatCurrency(group.totalOut, settings.currencySymbol, settings.language)}
                            </span>
                          )}
                          {group.transferVol > 0 && (
                            <span className="font-mono-num font-bold text-sky-600 dark:text-sky-400">
                              {isBn ? 'ট্রান্সফার:' : 'Transfer:'}{' '}
                              {formatCurrency(group.transferVol, settings.currencySymbol, settings.language)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openAddTransaction({
                          preselectedAccountId: singleSelectedAccountId ?? undefined,
                          initialSubcategory: group.rawForNew,
                        })
                      }
                      className="min-h-[34px] px-2.5 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 text-[11px] font-bold flex items-center gap-1 shrink-0"
                    >
                      <Plus size={13} />
                      <span>{isBn ? 'যোগ করুন' : 'Add'}</span>
                    </button>
                  </div>

                  {/* Card breakdown strip inside this subcategory */}
                  {cardEntries.length > 0 && (
                    <div className="px-4 py-2 flex flex-wrap gap-1.5 border-b border-slate-200/40 dark:border-white/5 bg-white/30 dark:bg-black/10">
                      {cardEntries.map((ce) => (
                        <span
                          key={ce.name}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: ce.account?.colorHex || '#64748B' }}
                          />
                          <span>{ce.name}</span>
                          {ce.inAmt > 0 && (
                            <span className="font-mono-num text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(ce.inAmt, settings.currencySymbol, settings.language)}
                            </span>
                          )}
                          {ce.outAmt > 0 && (
                            <span className="font-mono-num text-rose-600 dark:text-rose-400">
                              -{formatCurrency(ce.outAmt, settings.currencySymbol, settings.language)}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}

                  {!isCollapsed && (
                    <div className="divide-y divide-slate-200/60 dark:divide-white/10">
                      {group.items.map(renderTransactionRow)}
                    </div>
                  )}
                </TranslucentCard>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: CHRONOLOGICAL LIST */}
      {viewMode === 'LIST' && (
        groupedByDay.length === 0 ? (
          <TranslucentCard className="p-8 text-center space-y-3">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {t('no_transactions_found', settings.language)}
            </p>
            <button
              type="button"
              onClick={() =>
                openAddTransaction({
                  preselectedAccountId: singleSelectedAccountId ?? undefined,
                })
              }
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
                  {group.items.map(renderTransactionRow)}
                </TranslucentCard>
              </div>
            ))}
          </div>
        )
      )}

      {/* VIEW 3: MONTHLY CARD & CATEGORY REPORT */}
      {viewMode === 'REPORT' && (
        <div className="space-y-4">
          {/* Card-wise Monthly Report */}
          <TranslucentCard className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {isBn ? 'কার্ড অনুযায়ী মাসিক হিসাব' : 'Card-wise Monthly Flow'}
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {isBn ? 'কার্ডে ট্যাপ করে ফিল্টার করুন' : 'Tap a card to filter'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {reportStats.perCard.map(({ account, cardIn, cardOut, net, count }) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => {
                    setFilter((f) => ({ ...f, accountIds: [account.id] }));
                    setViewMode('SUBCATEGORY');
                  }}
                  className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200/70 dark:border-white/10 text-left hover:border-sky-500/50 transition space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: account.colorHex }}
                      />
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {account.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono-num font-bold text-slate-700 dark:text-slate-200">
                      {formatCurrency(account.balance, settings.currencySymbol, settings.language)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">{isBn ? 'ইন' : 'In'}</span>
                      <span className="font-mono-num font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(cardIn, settings.currencySymbol, settings.language)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">{isBn ? 'আউট' : 'Out'}</span>
                      <span className="font-mono-num font-bold text-rose-600 dark:text-rose-400">
                        -{formatCurrency(cardOut, settings.currencySymbol, settings.language)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">
                        {isBn ? `নিট (${localizeDigits(count, settings.language)})` : `Net (${count})`}
                      </span>
                      <span className="font-mono-num font-bold text-slate-900 dark:text-white">
                        {formatCurrency(net, settings.currencySymbol, settings.language, true)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </TranslucentCard>

          {/* Expense Breakdown */}
          <TranslucentCard className="p-4 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {isBn ? 'খরচের ক্যাটাগরি ও সাব-ক্যাটাগরি' : 'Expense Category Breakdown'}
            </h3>
            {reportStats.expenseBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500">{t('no_transactions_found', settings.language)}</p>
            ) : (
              reportStats.expenseBreakdown.map((item) => (
                <div key={item.categoryName} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {isBn ? item.categoryNameBn : item.categoryName} (
                      {localizeDigits(item.count, settings.language)})
                    </span>
                    <span className="font-mono-num font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(item.amount, settings.currencySymbol, settings.language)} (
                      {localizeDigits(Math.round(item.percentage), settings.language)}%)
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
                  {item.subcategories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-1 pt-0.5">
                      {item.subcategories.map((sub) => (
                        <span
                          key={sub.name}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono-num"
                        >
                          {sub.name}:{' '}
                          {formatCurrency(sub.amount, settings.currencySymbol, settings.language)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </TranslucentCard>

          {/* Income Breakdown */}
          <TranslucentCard className="p-4 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {isBn ? 'আয়ের ক্যাটাগরি ও সাব-ক্যাটাগরি' : 'Income Category Breakdown'}
            </h3>
            {reportStats.incomeBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500">{t('no_transactions_found', settings.language)}</p>
            ) : (
              reportStats.incomeBreakdown.map((item) => (
                <div key={item.categoryName} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {isBn ? item.categoryNameBn : item.categoryName} (
                      {localizeDigits(item.count, settings.language)})
                    </span>
                    <span className="font-mono-num font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(item.amount, settings.currencySymbol, settings.language)} (
                      {localizeDigits(Math.round(item.percentage), settings.language)}%)
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
              {/* Transaction Type Granular Filter */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-slate-500">
                  {isBn ? 'লেনদেনের ধরন' : 'Transaction Type'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ['ALL', t('all', settings.language)],
                      ['EXPENSE', t('expense', settings.language)],
                      ['INCOME', t('income', settings.language)],
                      ['TRANSFER', t('transfer', settings.language)],
                      ['LEND', t('receivable', settings.language)],
                      ['BORROW', t('payable', settings.language)],
                      ['CC_PAYMENT', isBn ? 'কার্ড বিল' : 'Card Bill'],
                    ] as Array<[TransactionType | 'ALL', string]>
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFilter((f) => ({ ...f, typeFilter: id }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                        filter.typeFilter === id
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

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
                  ).map(([id, label]) => {
                    const active =
                      (id === 'ALL' && monthMode === 'ALL' && filter.datePreset !== 'CUSTOM' && filter.datePreset !== 'THIS_YEAR') ||
                      (id === 'THIS_YEAR' && monthMode === 'ALL' && filter.datePreset === 'THIS_YEAR') ||
                      (id === 'CUSTOM' && filter.datePreset === 'CUSTOM') ||
                      (id === 'THIS_MONTH' &&
                        monthMode === 'MONTH' &&
                        filter.datePreset !== 'CUSTOM' &&
                        selectedYear === now.getFullYear() &&
                        selectedMonth0 === now.getMonth());
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          if (id === 'ALL') {
                            setMonthMode('ALL');
                            setFilter((f) => ({ ...f, datePreset: 'ALL' }));
                          } else if (id === 'THIS_YEAR') {
                            setMonthMode('ALL');
                            setFilter((f) => ({ ...f, datePreset: 'THIS_YEAR' }));
                          } else if (id === 'THIS_MONTH') {
                            setMonthMode('MONTH');
                            setSelectedYear(now.getFullYear());
                            setSelectedMonth0(now.getMonth());
                            setFilter((f) => ({ ...f, datePreset: 'THIS_MONTH' }));
                          } else if (id === 'LAST_MONTH') {
                            const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                            setMonthMode('MONTH');
                            setSelectedYear(prev.getFullYear());
                            setSelectedMonth0(prev.getMonth());
                            setFilter((f) => ({ ...f, datePreset: 'LAST_MONTH' }));
                          } else {
                            setFilter((f) => ({ ...f, datePreset: 'CUSTOM' }));
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                          active
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
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
                onClick={() => {
                  setFilter(DEFAULT_FILTER);
                  setMonthMode('MONTH');
                  setSelectedYear(now.getFullYear());
                  setSelectedMonth0(now.getMonth());
                  setFlowFilter('ALL');
                  setSelectedSubFilter('ALL');
                }}
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
