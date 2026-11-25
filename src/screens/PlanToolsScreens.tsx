import React, { useEffect, useMemo, useState } from 'react';
import {
  RefreshCw,
  ArrowUpDown,
  Copy,
  Edit2,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import { SUPPORTED_CONVERTER_CURRENCIES } from '../data/currencies';
import {
  clearCustomRateOverride,
  fetchLiveExchangeRates,
  getEffectivePairRate,
  getLivePairRate,
  loadCachedRatesPerUsd,
  loadCustomRateOverrides,
  saveCustomRateOverride,
  shouldAutoRefreshRates,
} from '../services/currencyRates';
import {
  buildCategoryBreakdown,
  isEligibleExpense,
  isEligibleIncome,
} from '../utils/analytics';
import { formatCompactCurrency, formatCurrency, formatMonthYear, formatShortDate } from '../utils/formatters';
import { SubScreenHeader, TranslucentCard } from '../components/GlassPrimitives';
import { CategoryIcon } from '../components/CategoryIcon';

export function CurrencyConverterScreen() {
  const { settings, closeSubScreen, showSnackbar } = useWallet();
  const isBn = settings.language === 'BANGLA';

  const [fromCode, setFromCode] = useState('USD');
  const [toCode, setToCode] = useState(
    SUPPORTED_CONVERTER_CURRENCIES.some((c) => c.code === settings.currencyCode)
      ? settings.currencyCode
      : 'BDT'
  );
  const [amountStr, setAmountStr] = useState('100');
  const [ratesPerUsd, setRatesPerUsd] = useState<Record<string, number>>(() =>
    loadCachedRatesPerUsd()
  );
  const [customOverrides, setCustomOverrides] = useState<Record<string, number>>(() =>
    loadCustomRateOverrides()
  );
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [customRateInput, setCustomRateInput] = useState('');

  useEffect(() => {
    if (shouldAutoRefreshRates()) {
      void fetchLiveExchangeRates().then((res) => {
        setRatesPerUsd(res.ratesPerUsd);
      });
    }
  }, []);

  const { rate, isCustom } = useMemo(
    () => getEffectivePairRate(fromCode, toCode, ratesPerUsd, customOverrides),
    [customOverrides, fromCode, ratesPerUsd, toCode]
  );

  const amount = parseFloat(amountStr) || 0;
  const converted = amount * rate;
  const fromInfo = SUPPORTED_CONVERTER_CURRENCIES.find((c) => c.code === fromCode)!;
  const toInfo = SUPPORTED_CONVERTER_CURRENCIES.find((c) => c.code === toCode)!;

  const handleRefresh = async () => {
    setRefreshing(true);
    const res = await fetchLiveExchangeRates();
    setRatesPerUsd(res.ratesPerUsd);
    setRefreshing(false);
    showSnackbar(
      res.isLiveSuccess
        ? t('rates_updated', settings.language)
        : t('offline_cached_rates', settings.language)
    );
  };

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SUPPORTED_CONVERTER_CURRENCIES;
    return SUPPORTED_CONVERTER_CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.countryKeywords.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader
        title={t('currency_converter_title', settings.language)}
        onBack={closeSubScreen}
        rightAction={
          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="w-9 h-9 rounded-full glass-card flex items-center justify-center"
            aria-label={t('refresh_rates', settings.language)}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        }
      />

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        <TranslucentCard className="p-5 space-y-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <select
              value={fromCode}
              onChange={(e) => setFromCode(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm font-bold"
            >
              {SUPPORTED_CONVERTER_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setFromCode(toCode);
                setToCode(fromCode);
              }}
              className="w-10 h-10 rounded-full bg-sky-500/15 text-sky-600 flex items-center justify-center"
              aria-label={t('swap_currencies', settings.language)}
            >
              <ArrowUpDown size={16} />
            </button>

            <select
              value={toCode}
              onChange={(e) => setToCode(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm font-bold"
            >
              {SUPPORTED_CONVERTER_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
          </div>

          <input
            type="number"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-2xl font-black font-mono-num outline-none"
          />

          <div className="flex flex-wrap gap-1.5">
            {['1', '10', '100', '500', '1000', '5000'].map((qa) => (
              <button
                key={qa}
                type="button"
                onClick={() => setAmountStr(qa)}
                className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
              >
                {fromInfo.symbol}
                {qa}
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-sky-500/10 border border-sky-500/20 p-4 flex items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase text-sky-700 dark:text-sky-300">
                1 {fromCode} = {rate.toFixed(4)} {toCode} (
                {isCustom ? t('custom_badge', settings.language) : t('live_badge', settings.language)})
              </span>
              <p className="text-2xl font-black font-mono-num text-slate-900 dark:text-white mt-0.5">
                {toInfo.symbol} {converted.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCustomRateInput(rate.toFixed(4));
                  setShowRateDialog(true);
                }}
                className="p-2 rounded-xl bg-white/80 dark:bg-slate-800 text-sky-600"
                title={t('edit_rate', settings.language)}
              >
                <Edit2 size={15} />
              </button>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(converted.toFixed(2));
                  showSnackbar(t('copied_to_clipboard', settings.language));
                }}
                className="p-2 rounded-xl bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                title={t('copy_result', settings.language)}
              >
                <Copy size={15} />
              </button>
            </div>
          </div>
        </TranslucentCard>

        <TranslucentCard className="p-4 space-y-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_currency_hint', settings.language)}
            className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 px-3.5 py-2 text-xs outline-none"
          />
          <div className="divide-y divide-slate-200/60 dark:divide-white/10 max-h-80 overflow-y-auto">
            {filteredList.map((c) => {
              const pair = getEffectivePairRate(fromCode, c.code, ratesPerUsd, customOverrides);
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setToCode(c.code)}
                  className="w-full py-2.5 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{c.flag}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{c.code}</p>
                      <p className="text-[11px] text-slate-500">{isBn ? c.nameBn : c.nameEn}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono-num font-bold">
                    {c.symbol} {(amount * pair.rate).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </button>
              );
            })}
          </div>
        </TranslucentCard>
      </div>

      {showRateDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">{t('set_custom_rate', settings.language)}</h3>
              <button type="button" onClick={() => setShowRateDialog(false)}>
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {t('live_reference_rate', settings.language)}: 1 {fromCode} ={' '}
              {getLivePairRate(fromCode, toCode, ratesPerUsd).toFixed(4)} {toCode}
            </p>
            <input
              type="number"
              value={customRateInput}
              onChange={(e) => setCustomRateInput(e.target.value)}
              className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-base font-bold font-mono-num"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setCustomOverrides(clearCustomRateOverride(fromCode, toCode));
                  setShowRateDialog(false);
                }}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
              >
                {t('reset_to_live_rate', settings.language)}
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = parseFloat(customRateInput);
                  if (val > 0) setCustomOverrides(saveCustomRateOverride(fromCode, toCode, val));
                  setShowRateDialog(false);
                }}
                className="flex-1 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold"
              >
                {t('save', settings.language)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MonthlyRecapScreen() {
  const { transactions, categories, accounts, settings, closeSubScreen, showSnackbar } = useWallet();
  const isBn = settings.language === 'BANGLA';
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const stats = useMemo(() => {
    const start = new Date(cursor.year, cursor.month, 1).getTime();
    const end = new Date(cursor.year, cursor.month + 1, 0, 23, 59, 59, 999).getTime();
    const monthTxs = transactions.filter((tx) => tx.timestamp >= start && tx.timestamp <= end);
    let income = 0;
    let expense = 0;
    for (const tx of monthTxs) {
      if (isEligibleIncome(tx)) income += tx.amount;
      else if (isEligibleExpense(tx)) expense += tx.amount;
    }
    const net = income - expense;
    const rate = income > 0 ? Math.round((net / income) * 100) : 0;
    const grade =
      income === 0 && expense === 0
        ? '-'
        : rate >= 30
        ? 'A+'
        : rate >= 15
        ? 'A'
        : rate >= 0
        ? 'B'
        : 'C';
    const topCats = buildCategoryBreakdown(monthTxs, categories, 'EXPENSE').slice(0, 3);
    const walletUsage = accounts
      .map((acc) => ({
        acc,
        count: monthTxs.filter((tx) => tx.accountId === acc.id).length,
      }))
      .filter((w) => w.count > 0);
    return { monthTxs, income, expense, net, rate, grade, topCats, walletUsage };
  }, [accounts, categories, cursor.month, cursor.year, transactions]);

  const stepMonth = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader
        title={t('monthly_recap_title', settings.language)}
        onBack={closeSubScreen}
        rightAction={
          <button
            type="button"
            onClick={() => {
              const txt = `${formatMonthYear(cursor.year, cursor.month, settings.language)} Recap\nIncome: ${formatCurrency(
                stats.income,
                settings.currencySymbol,
                settings.language
              )}\nExpense: ${formatCurrency(stats.expense, settings.currencySymbol, settings.language)}\nNet: ${formatCurrency(
                stats.net,
                settings.currencySymbol,
                settings.language,
                true
              )}`;
              void navigator.clipboard?.writeText(txt);
              showSnackbar(t('copied_to_clipboard', settings.language));
            }}
            className="w-9 h-9 rounded-full glass-card flex items-center justify-center"
          >
            <Copy size={15} />
          </button>
        }
      />

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        <TranslucentCard className="p-3 flex items-center justify-between">
          <button type="button" onClick={() => stepMonth(-1)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-extrabold">
            {formatMonthYear(cursor.year, cursor.month, settings.language)}
          </span>
          <button type="button" onClick={() => stepMonth(1)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
            <ChevronRight size={18} />
          </button>
        </TranslucentCard>

        <TranslucentCard className="p-5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs text-slate-500">{t('net_saved', settings.language)}</p>
            <p className="text-2xl font-black font-mono-num">
              {formatCurrency(stats.net, settings.currencySymbol, settings.language, true)}
            </p>
            <p className="text-xs text-slate-500">
              {t('savings_rate', settings.language)}: {stats.rate}%
            </p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-sky-600 text-white flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase">{t('grade_prefix', settings.language)}</span>
            <span className="text-2xl font-black">{stats.grade}</span>
          </div>
        </TranslucentCard>

        <div className="grid grid-cols-3 gap-2.5">
          <TranslucentCard className="p-3">
            <p className="text-[11px] text-slate-500">{t('income', settings.language)}</p>
            <p className="text-sm font-extrabold font-mono-num text-emerald-600">
              {formatCurrency(stats.income, settings.currencySymbol, settings.language)}
            </p>
          </TranslucentCard>
          <TranslucentCard className="p-3">
            <p className="text-[11px] text-slate-500">{t('expenses', settings.language)}</p>
            <p className="text-sm font-extrabold font-mono-num text-rose-600">
              {formatCurrency(stats.expense, settings.currencySymbol, settings.language)}
            </p>
          </TranslucentCard>
          <TranslucentCard className="p-3">
            <p className="text-[11px] text-slate-500">{t('transactions_label', settings.language)}</p>
            <p className="text-sm font-extrabold font-mono-num">{stats.monthTxs.length}</p>
          </TranslucentCard>
        </div>

        <TranslucentCard className="p-4 space-y-2.5">
          <h3 className="text-xs font-bold uppercase text-slate-500">
            {t('top_spending_categories', settings.language)}
          </h3>
          {stats.topCats.length === 0 ? (
            <p className="text-xs text-slate-500">{t('no_expenses_this_month', settings.language)}</p>
          ) : (
            stats.topCats.map((c) => (
              <div key={c.categoryName} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CategoryIcon iconName={c.iconName} colorHex={c.colorHex} size={32} iconSize={16} />
                  <span className="text-xs font-bold">{isBn ? c.categoryNameBn : c.categoryName}</span>
                </div>
                <span className="text-xs font-extrabold font-mono-num">
                  {formatCurrency(c.amount, settings.currencySymbol, settings.language)}
                </span>
              </div>
            ))
          )}
        </TranslucentCard>
      </div>
    </div>
  );
}

export function SpendingComparisonScreen() {
  const { transactions, categories, settings, closeSubScreen } = useWallet();
  const isBn = settings.language === 'BANGLA';
  const [sortBy, setSortBy] = useState<'AMOUNT' | 'CHANGE'>('AMOUNT');

  const data = useMemo(() => {
    const now = new Date();
    const curStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();

    const curTxs = transactions.filter((tx) => tx.timestamp >= curStart && isEligibleExpense(tx));
    const prevTxs = transactions.filter(
      (tx) => tx.timestamp >= prevStart && tx.timestamp <= prevEnd && isEligibleExpense(tx)
    );

    const curTotal = curTxs.reduce((a, b) => a + b.amount, 0);
    const prevTotal = prevTxs.reduce((a, b) => a + b.amount, 0);

    const map = new Map<string, { cur: number; prev: number }>();
    for (const tx of curTxs) {
      const entry = map.get(tx.category) ?? { cur: 0, prev: 0 };
      entry.cur += tx.amount;
      map.set(tx.category, entry);
    }
    for (const tx of prevTxs) {
      const entry = map.get(tx.category) ?? { cur: 0, prev: 0 };
      entry.prev += tx.amount;
      map.set(tx.category, entry);
    }

    const rows = Array.from(map.entries()).map(([catName, v]) => {
      const meta = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
      const diff = v.cur - v.prev;
      const pct = v.prev > 0 ? Math.round((diff / v.prev) * 100) : v.cur > 0 ? 100 : 0;
      return {
        catName,
        catNameBn: meta?.nameBn || catName,
        iconName: meta?.iconName || 'category',
        colorHex: meta?.colorHex || '#0284C7',
        cur: v.cur,
        prev: v.prev,
        diff,
        pct,
      };
    });

    rows.sort((a, b) =>
      sortBy === 'CHANGE' ? Math.abs(b.diff) - Math.abs(a.diff) : b.cur - a.cur
    );

    return { curTotal, prevTotal, rows };
  }, [categories, sortBy, transactions]);

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader title={t('spending_comparison', settings.language)} onBack={closeSubScreen} />
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        <TranslucentCard className="p-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] text-slate-500">{t('this_month', settings.language)}</p>
            <p className="text-lg font-black font-mono-num">
              {formatCurrency(data.curTotal, settings.currencySymbol, settings.language)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500">{t('last_month', settings.language)}</p>
            <p className="text-lg font-black font-mono-num text-slate-500">
              {formatCurrency(data.prevTotal, settings.currencySymbol, settings.language)}
            </p>
          </div>
        </TranslucentCard>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setSortBy('AMOUNT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
              sortBy === 'AMOUNT' ? 'bg-sky-600 text-white' : 'glass-card'
            }`}
          >
            {t('sort_amount', settings.language)}
          </button>
          <button
            type="button"
            onClick={() => setSortBy('CHANGE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
              sortBy === 'CHANGE' ? 'bg-sky-600 text-white' : 'glass-card'
            }`}
          >
            {t('sort_change', settings.language)}
          </button>
        </div>

        <TranslucentCard className="divide-y divide-slate-200/60 dark:divide-white/10">
          {data.rows.map((r) => (
            <div key={r.catName} className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <CategoryIcon iconName={r.iconName} colorHex={r.colorHex} size={36} iconSize={17} />
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{isBn ? r.catNameBn : r.catName}</p>
                  <p className="text-[11px] text-slate-500 font-mono-num">
                    {formatCompactCurrency(r.cur, settings.currencySymbol, settings.language)}{' '}
                    {t('vs', settings.language)}{' '}
                    {formatCompactCurrency(r.prev, settings.currencySymbol, settings.language)}
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-extrabold font-mono-num ${
                  r.diff > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {r.diff > 0 ? '+' : ''}
                {r.pct}%
              </span>
            </div>
          ))}
        </TranslucentCard>
      </div>
    </div>
  );
}

export function IncomeTrackerScreen() {
  const { transactions, categories, settings, closeSubScreen } = useWallet();
  const isBn = settings.language === 'BANGLA';

  const summary = useMemo(() => {
    const now = new Date();
    const months: Array<{ label: string; amount: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1).getTime();
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999).getTime();
      const d = new Date(start);
      const amt = transactions
        .filter((tx) => tx.timestamp >= start && tx.timestamp <= end && isEligibleIncome(tx))
        .reduce((a, b) => a + b.amount, 0);
      months.push({ label: d.toLocaleString('en', { month: 'short' }), amount: amt });
    }
    const allIncome = transactions.filter(isEligibleIncome);
    const streams = buildCategoryBreakdown(allIncome, categories, 'INCOME');
    const total = allIncome.reduce((a, b) => a + b.amount, 0);
    return { months, streams, total };
  }, [categories, transactions]);

  const maxM = Math.max(1, ...summary.months.map((m) => m.amount));

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader title={t('income_tracker', settings.language)} onBack={closeSubScreen} />
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        <TranslucentCard className="p-4">
          <p className="text-xs text-slate-500">{t('total_income', settings.language)}</p>
          <p className="text-2xl font-black font-mono-num text-emerald-600 mt-0.5">
            {formatCurrency(summary.total, settings.currencySymbol, settings.language)}
          </p>
          <div className="grid grid-cols-6 gap-2 items-end h-28 pt-4">
            {summary.months.map((m) => (
              <div key={m.label} className="flex flex-col items-center justify-end gap-1 h-full">
                <div
                  className="w-full max-w-[28px] rounded-t-lg bg-emerald-500"
                  style={{ height: `${Math.max(8, Math.round((m.amount / maxM) * 85))}%` }}
                />
                <span className="text-[10px] font-semibold text-slate-500">{m.label}</span>
              </div>
            ))}
          </div>
        </TranslucentCard>

        <TranslucentCard className="divide-y divide-slate-200/60 dark:divide-white/10">
          {summary.streams.map((s) => (
            <div key={s.categoryName} className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CategoryIcon iconName={s.iconName} colorHex={s.colorHex} size={36} iconSize={17} />
                <div>
                  <p className="text-xs font-bold">{isBn ? s.categoryNameBn : s.categoryName}</p>
                  <p className="text-[11px] text-slate-500">
                    {s.count} {t('payments_count', settings.language)} • {Math.round(s.percentage)}%
                  </p>
                </div>
              </div>
              <span className="text-xs font-extrabold font-mono-num text-emerald-600">
                {formatCurrency(s.amount, settings.currencySymbol, settings.language)}
              </span>
            </div>
          ))}
        </TranslucentCard>
      </div>
    </div>
  );
}

export function CalendarScreen() {
  const { transactions, accounts, settings, closeSubScreen, openAddTransaction } = useWallet();
  const isBn = settings.language === 'BANGLA';
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedDay, setSelectedDay] = useState<number>(now.getDate());

  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const firstDow = new Date(cursor.year, cursor.month, 1).getDay();

  const dayMap = useMemo(() => {
    const map = new Map<number, typeof transactions>();
    for (const tx of transactions) {
      const d = new Date(tx.timestamp);
      if (d.getFullYear() === cursor.year && d.getMonth() === cursor.month) {
        const day = d.getDate();
        const arr = map.get(day) ?? [];
        arr.push(tx);
        map.set(day, arr);
      }
    }
    return map;
  }, [cursor.month, cursor.year, transactions]);

  const selectedTxs = dayMap.get(selectedDay) ?? [];
  const ccDueDates = accounts.filter((a) => !a.isHidden && a.type === 'CREDIT_CARD' && a.paymentDueDate);

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader title={t('calendar', settings.language)} onBack={closeSubScreen} />
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        <TranslucentCard className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                const d = new Date(cursor.year, cursor.month - 1, 1);
                setCursor({ year: d.getFullYear(), month: d.getMonth() });
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-extrabold">
              {formatMonthYear(cursor.year, cursor.month, settings.language)}
            </span>
            <button
              type="button"
              onClick={() => {
                const d = new Date(cursor.year, cursor.month + 1, 1);
                setCursor({ year: d.getFullYear(), month: d.getMonth() });
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`empty_${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const list = dayMap.get(day) ?? [];
              const hasIn = list.some((tx) => tx.type === 'INCOME');
              const hasOut = list.some((tx) => tx.type === 'EXPENSE');
              const selected = day === selectedDay;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`h-11 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition ${
                    selected
                      ? 'bg-sky-600 text-white'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100'
                  }`}
                >
                  <span>{day}</span>
                  <div className="flex gap-0.5 mt-0.5 h-1.5">
                    {hasIn && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    {hasOut && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </TranslucentCard>

        {ccDueDates.length > 0 && (
          <TranslucentCard className="p-3.5 space-y-1.5">
            <p className="text-[11px] font-bold uppercase text-slate-500">
              {t('card_dates', settings.language)}
            </p>
            {ccDueDates.map((cc) => (
              <div key={cc.id} className="flex justify-between text-xs">
                <span className="font-bold">{cc.name}</span>
                <span className="text-amber-600 font-semibold">{cc.paymentDueDate}</span>
              </div>
            ))}
          </TranslucentCard>
        )}

        <TranslucentCard className="divide-y divide-slate-200/60 dark:divide-white/10">
          <div className="px-4 py-3 text-xs font-bold text-slate-500">
            {formatShortDate(new Date(cursor.year, cursor.month, selectedDay).getTime(), settings.language)} ({selectedTxs.length})
          </div>
          {selectedTxs.length === 0 ? (
            <div className="p-5 text-xs text-slate-500 text-center">
              {isBn ? 'এই দিনে কোনো লেনদেন নেই' : 'No transactions on this day'}
            </div>
          ) : (
            selectedTxs.map((tx) => (
              <div
                key={tx.id}
                onClick={() => openAddTransaction({ editingTx: tx })}
                className="p-3.5 flex justify-between items-center text-xs cursor-pointer"
              >
                <div>
                  <p className="font-bold">{tx.title || tx.category}</p>
                  <p className="text-slate-500">{tx.category}</p>
                </div>
                <span className="font-mono-num font-extrabold">
                  {formatCurrency(tx.amount, settings.currencySymbol, settings.language)}
                </span>
              </div>
            ))
          )}
        </TranslucentCard>
      </div>
    </div>
  );
}
