import React, { useMemo, useState } from 'react';
import {
  Download,
  Copy,
  Printer,
  ChevronRight,
  Calendar,
  X,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import {
  buildCategoryBreakdown,
  buildSpendingTrend,
  computeMonthlyBudgetTotal,
  isEligibleExpense,
  isEligibleIncome,
  resolvePeriodRange,
} from '../utils/analytics';
import { formatCompactCurrency, formatCurrency, getMonthKey } from '../utils/formatters';
import { TranslucentCard } from '../components/GlassPrimitives';
import { CategoryIcon } from '../components/CategoryIcon';
import { getThemeColors } from '../data/categoryCatalog';
import type { InsightsPeriod } from '../types/models';

export function InsightsScreen() {
  const { transactions, categories, budgets, settings, openSubScreen, showSnackbar } = useWallet();
  const isBn = settings.language === 'BANGLA';
  const accent = getThemeColors(settings.themeColor);

  const [period, setPeriod] = useState<InsightsPeriod>('THIS_MONTH');
  const [customStart, setCustomStart] = useState<number | null>(null);
  const [customEnd, setCustomEnd] = useState<number | null>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);

  const [trendMode, setTrendMode] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [hoverPointIdx, setHoverPointIdx] = useState<number | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const range = useMemo(
    () => resolvePeriodRange(period, customStart, customEnd, isBn),
    [customEnd, customStart, isBn, period]
  );

  const periodTxs = useMemo(
    () =>
      transactions.filter(
        (tx) => tx.timestamp >= range.startMillis && tx.timestamp <= range.endMillis
      ),
    [range.endMillis, range.startMillis, transactions]
  );

  const kpis = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of periodTxs) {
      if (isEligibleIncome(tx)) income += tx.amount;
      else if (isEligibleExpense(tx)) expense += tx.amount;
    }
    const net = income - expense;
    const rate = income > 0 ? Math.round((net / income) * 100) : 0;
    return { income, expense, net, rate };
  }, [periodTxs]);

  const trend = useMemo(
    () => buildSpendingTrend(transactions, range, trendMode === 'INCOME', isBn),
    [isBn, range, transactions, trendMode]
  );

  const breakdown = useMemo(
    () => buildCategoryBreakdown(periodTxs, categories, trendMode),
    [categories, periodTxs, trendMode]
  );

  const monthlyBudgetTotal = useMemo(
    () => computeMonthlyBudgetTotal(budgets, getMonthKey()),
    [budgets]
  );

  // SVG line chart points
  const chartGeom = useMemo(() => {
    const w = 360;
    const h = 140;
    const padX = 14;
    const padY = 16;
    const pts = trend.points;
    if (pts.length === 0) return { path: '', area: '', dots: [] as Array<{ x: number; y: number; label: string; amount: number }> };
    const maxY = Math.max(1, ...pts.map((p) => p.amount));
    const stepX = pts.length > 1 ? (w - padX * 2) / (pts.length - 1) : 0;
    const dots = pts.map((p, i) => ({
      x: pts.length === 1 ? w / 2 : padX + i * stepX,
      y: h - padY - (p.amount / maxY) * (h - padY * 2),
      label: p.label,
      amount: p.amount,
    }));
    const path = dots
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${d.x.toFixed(1)} ${d.y.toFixed(1)}`)
      .join(' ');
    const area =
      dots.length > 0
        ? `${path} L ${dots[dots.length - 1].x.toFixed(1)} ${h - padY} L ${dots[0].x.toFixed(1)} ${h - padY} Z`
        : '';
    return { path, area, dots };
  }, [trend.points]);

  // SVG Donut arcs
  const donutSegments = useMemo(() => {
    const total = breakdown.reduce((a, b) => a + b.amount, 0);
    if (total <= 0) return [];
    const r = 56;
    const c = 2 * Math.PI * r;
    let offset = 0;
    return breakdown.slice(0, 7).map((item) => {
      const len = (item.amount / total) * c;
      const seg = {
        ...item,
        dashArray: `${len} ${c - len}`,
        dashOffset: -offset,
      };
      offset += len;
      return seg;
    });
  }, [breakdown]);

  const handleDownloadCsv = () => {
    const headers = ['Category', 'Amount', 'Share%', 'Count'];
    const rows = breakdown.map((b) => [
      `"${b.categoryName}"`,
      b.amount.toFixed(2),
      b.percentage.toFixed(1),
      String(b.count),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hishab-pati-insights-${period.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSnackbar(isBn ? 'রিপোর্ট ডাউনলোড হয়েছে' : 'Report CSV downloaded');
  };

  const handleCopySummary = async () => {
    const lines = [
      `Hishab Pati Insights (${range.label})`,
      `Money In: ${formatCurrency(kpis.income, settings.currencySymbol, settings.language)}`,
      `Money Out: ${formatCurrency(kpis.expense, settings.currencySymbol, settings.language)}`,
      `Net Flow: ${formatCurrency(kpis.net, settings.currencySymbol, settings.language, true)}`,
      ...breakdown
        .slice(0, 5)
        .map(
          (b) =>
            `- ${b.categoryName}: ${formatCurrency(b.amount, settings.currencySymbol, settings.language)} (${Math.round(b.percentage)}%)`
        ),
    ];
    await navigator.clipboard?.writeText(lines.join('\n')).catch(() => undefined);
    showSnackbar(t('copied_to_clipboard', settings.language));
  };

  const periods: Array<{ id: InsightsPeriod; label: string }> = [
    { id: 'THIS_MONTH', label: t('this_month', settings.language) },
    { id: 'LAST_MONTH', label: t('last_month', settings.language) },
    { id: 'LAST_3_MONTHS', label: isBn ? 'গত ৩ মাস' : '3 Months' },
    { id: 'THIS_YEAR', label: t('this_year', settings.language) },
    { id: 'CUSTOM', label: t('custom', settings.language) },
  ];

  const inspectedDot = hoverPointIdx !== null ? chartGeom.dots[hoverPointIdx] : null;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-5 pb-28 space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {t('nav_insights', settings.language)}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{range.label}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowExportModal(true)}
          className="px-3.5 py-2 rounded-xl glass-card text-xs font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-100 no-print"
        >
          <Download size={14} /> {isBn ? 'এক্সপোর্ট' : 'Export'}
        </button>
      </header>

      {/* Period Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-print">
        {periods.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              if (p.id === 'CUSTOM') setShowCustomModal(true);
              setPeriod(p.id);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              period === p.id
                ? 'bg-sky-600 text-white'
                : 'glass-card text-slate-600 dark:text-slate-300'
            }`}
          >
            {p.id === 'CUSTOM' && <Calendar size={12} className="inline mr-1" />}
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <TranslucentCard className="p-3.5">
          <p className="text-[11px] text-slate-500">{t('money_in', settings.language)}</p>
          <p className="text-base font-extrabold font-mono-num text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatCurrency(kpis.income, settings.currencySymbol, settings.language)}
          </p>
        </TranslucentCard>
        <TranslucentCard className="p-3.5">
          <p className="text-[11px] text-slate-500">{t('money_out', settings.language)}</p>
          <p className="text-base font-extrabold font-mono-num text-rose-600 dark:text-rose-400 mt-0.5">
            {formatCurrency(kpis.expense, settings.currencySymbol, settings.language)}
          </p>
        </TranslucentCard>
        <TranslucentCard className="p-3.5">
          <p className="text-[11px] text-slate-500">{t('net', settings.language)}</p>
          <p className="text-base font-extrabold font-mono-num text-slate-900 dark:text-white mt-0.5">
            {formatCurrency(kpis.net, settings.currencySymbol, settings.language, true)}
          </p>
        </TranslucentCard>
        <TranslucentCard className="p-3.5">
          <p className="text-[11px] text-slate-500">{t('savings_rate', settings.language)}</p>
          <p className="text-base font-extrabold font-mono-num text-sky-600 dark:text-sky-400 mt-0.5">
            {kpis.rate}%
          </p>
        </TranslucentCard>
      </div>

      {/* Budget Status Strip */}
      {monthlyBudgetTotal > 0 && (
        <TranslucentCard
          className="p-4 flex items-center justify-between gap-3"
          onClick={() => openSubScreen('BUDGET_DASHBOARD')}
        >
          <div className="space-y-1 flex-1">
            <div className="flex justify-between text-xs font-bold">
              <span>{t('budget_status', settings.language)}</span>
              <span>{Math.round((kpis.expense / monthlyBudgetTotal) * 100)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  kpis.expense > monthlyBudgetTotal ? 'bg-red-500' : 'bg-sky-500'
                }`}
                style={{ width: `${Math.min(100, (kpis.expense / monthlyBudgetTotal) * 100)}%` }}
              />
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-400 shrink-0" />
        </TranslucentCard>
      )}

      {/* Mode Switch & Trend Line Chart */}
      <TranslucentCard className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {trendMode === 'EXPENSE'
                ? isBn
                  ? 'ব্যয়ের গতিপ্রকৃতি'
                  : 'Spending Trend'
                : isBn
                ? 'আয়ের গতিপ্রকৃতি'
                : 'Income Trend'}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {inspectedDot
                ? `${inspectedDot.label}: ${formatCurrency(
                    inspectedDot.amount,
                    settings.currencySymbol,
                    settings.language
                  )}`
                : `${t('daily_average', settings.language)}: ${formatCurrency(
                    trend.dailyAverage,
                    settings.currencySymbol,
                    settings.language
                  )}`}
            </p>
          </div>
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-bold">
            {(['EXPENSE', 'INCOME'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setTrendMode(m);
                  setHoverPointIdx(null);
                }}
                className={`px-3 py-1 rounded-lg transition ${
                  trendMode === m ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'
                }`}
              >
                {m === 'EXPENSE' ? t('expense', settings.language) : t('income', settings.language)}
              </button>
            ))}
          </div>
        </div>

        <svg viewBox="0 0 360 140" className="w-full h-36 overflow-visible">
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={trendMode === 'INCOME' ? '#10B981' : accent.primary} stopOpacity="0.35" />
              <stop offset="100%" stopColor={trendMode === 'INCOME' ? '#10B981' : accent.primary} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {chartGeom.area && <path d={chartGeom.area} fill="url(#trendGrad)" />}
          {chartGeom.path && (
            <path
              d={chartGeom.path}
              fill="none"
              stroke={trendMode === 'INCOME' ? '#10B981' : accent.primary}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {chartGeom.dots.map((d, idx) => (
            <circle
              key={idx}
              cx={d.x}
              cy={d.y}
              r={hoverPointIdx === idx ? 5 : 3}
              fill={trendMode === 'INCOME' ? '#10B981' : accent.primary}
              className="cursor-pointer"
              onMouseEnter={() => setHoverPointIdx(idx)}
              onClick={() => setHoverPointIdx(idx)}
            />
          ))}
        </svg>
        <div className="flex justify-between text-[10px] text-slate-400 px-1">
          <span>{trend.points[0]?.label || ''}</span>
          <span>
            {isBn ? 'সর্বোচ্চ' : 'Peak'}: {trend.highestLabel} (
            {formatCompactCurrency(trend.highestAmount, settings.currencySymbol, settings.language)})
          </span>
          <span>{trend.points[trend.points.length - 1]?.label || ''}</span>
        </div>
      </TranslucentCard>

      {/* Donut Chart + Category & Subcategory Drill-down */}
      <TranslucentCard className="p-4 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          {t('category_breakdown', settings.language)}
        </h2>

        {breakdown.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            {t('no_records_for_period', settings.language)}
          </p>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative w-40 h-40 shrink-0">
                <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                  <circle
                    cx="70"
                    cy="70"
                    r="56"
                    fill="none"
                    stroke="currentColor"
                    className="text-slate-200/70 dark:text-slate-800"
                    strokeWidth="16"
                  />
                  {donutSegments.map((seg) => (
                    <circle
                      key={seg.categoryName}
                      cx="70"
                      cy="70"
                      r="56"
                      fill="none"
                      stroke={seg.colorHex}
                      strokeWidth="16"
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                      className="cursor-pointer transition-opacity hover:opacity-80"
                      onClick={() =>
                        setExpandedCat(
                          expandedCat === seg.categoryName ? null : seg.categoryName
                        )
                      }
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                  <span className="text-[10px] uppercase text-slate-500 font-bold">
                    {trendMode === 'INCOME' ? t('income', settings.language) : t('expense', settings.language)}
                  </span>
                  <span className="text-sm font-black font-mono-num text-slate-900 dark:text-white truncate max-w-full">
                    {formatCompactCurrency(
                      trendMode === 'INCOME' ? kpis.income : kpis.expense,
                      settings.currencySymbol,
                      settings.language
                    )}
                  </span>
                </div>
              </div>

              <div className="flex-1 w-full space-y-2">
                {breakdown.slice(0, 6).map((item) => (
                  <button
                    key={item.categoryName}
                    type="button"
                    onClick={() =>
                      setExpandedCat(
                        expandedCat === item.categoryName ? null : item.categoryName
                      )
                    }
                    className="w-full flex items-center justify-between gap-2 text-left py-1"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.colorHex }}
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {isBn ? item.categoryNameBn : item.categoryName}
                      </span>
                    </div>
                    <span className="text-xs font-mono-num font-bold text-slate-600 dark:text-slate-300 shrink-0">
                      {Math.round(item.percentage)}% •{' '}
                      {formatCompactCurrency(item.amount, settings.currencySymbol, settings.language)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Drill-down list */}
            <div className="divide-y divide-slate-200/60 dark:divide-white/10 pt-2">
              {breakdown.map((item) => {
                const isOpen = expandedCat === item.categoryName;
                return (
                  <div key={item.categoryName} className="py-2.5">
                    <button
                      type="button"
                      onClick={() => setExpandedCat(isOpen ? null : item.categoryName)}
                      className="w-full flex items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CategoryIcon
                          iconName={item.iconName}
                          colorHex={item.colorHex}
                          size={36}
                          iconSize={17}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {isBn ? item.categoryNameBn : item.categoryName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {item.count} {t('transactions_label', settings.language)} •{' '}
                            {Math.round(item.percentage)}%
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold font-mono-num text-slate-900 dark:text-white shrink-0">
                        {formatCurrency(item.amount, settings.currencySymbol, settings.language)}
                      </span>
                    </button>
                    {isOpen && item.subcategories.length > 0 && (
                      <div className="mt-2 ml-12 space-y-1.5 border-l-2 border-slate-200 dark:border-white/10 pl-3">
                        {item.subcategories.map((sub) => (
                          <div
                            key={sub.name}
                            className="flex items-center justify-between text-[11px]"
                          >
                            <span className="text-slate-600 dark:text-slate-300 font-medium">
                              {sub.name} ({sub.count})
                            </span>
                            <span className="font-mono-num font-bold text-slate-800 dark:text-slate-100">
                              {formatCurrency(sub.amount, settings.currencySymbol, settings.language)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </TranslucentCard>

      {/* Custom Date Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">{t('select_date_range', settings.language)}</h3>
              <button type="button" onClick={() => setShowCustomModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">{t('from', settings.language)}</label>
                <input
                  type="date"
                  value={customStart ? new Date(customStart).toISOString().slice(0, 10) : ''}
                  onChange={(e) =>
                    setCustomStart(e.target.value ? new Date(e.target.value).getTime() : null)
                  }
                  className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-slate-500 block mb-1">{t('to', settings.language)}</label>
                <input
                  type="date"
                  value={customEnd ? new Date(customEnd).toISOString().slice(0, 10) : ''}
                  onChange={(e) =>
                    setCustomEnd(
                      e.target.value ? new Date(e.target.value).getTime() + 86_399_000 : null
                    )
                  }
                  className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setPeriod('CUSTOM');
                setShowCustomModal(false);
              }}
              className="w-full py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold"
            >
              {t('apply_filters', settings.language)}
            </button>
          </div>
        </div>
      )}

      {/* Export Report Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isBn ? 'ইনসাইটস রিপোর্ট এক্সপোর্ট' : 'Export Financial Report'}
              </h3>
              <button type="button" onClick={() => setShowExportModal(false)}>
                <X size={16} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                handleDownloadCsv();
                setShowExportModal(false);
              }}
              className="w-full p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center gap-3 text-xs font-bold"
            >
              <Download size={16} className="text-sky-600" />
              <span>{isBn ? 'CSV স্প্রেডশিট ডাউনলোড' : 'Download CSV Report'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                void handleCopySummary();
                setShowExportModal(false);
              }}
              className="w-full p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center gap-3 text-xs font-bold"
            >
              <Copy size={16} className="text-emerald-600" />
              <span>{isBn ? 'সারাংশ কপি করুন' : 'Copy Text Summary'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowExportModal(false);
                window.setTimeout(() => window.print(), 150);
              }}
              className="w-full p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center gap-3 text-xs font-bold"
            >
              <Printer size={16} className="text-violet-600" />
              <span>{isBn ? 'প্রিন্ট / PDF সংরক্ষণ' : 'Print / Save as PDF'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
