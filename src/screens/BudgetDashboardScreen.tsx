import React, { useMemo, useState } from 'react';
import { Plus, Eye, EyeOff, Edit3 } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import { computeMonthlyBudgetTotal, isEligibleExpense } from '../utils/analytics';
import { formatCompactCurrency, formatCurrency, getMonthKey } from '../utils/formatters';
import { SubScreenHeader, TranslucentCard, SectionHeader } from '../components/GlassPrimitives';
import { CategoryIcon } from '../components/CategoryIcon';

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startAngle: number,
  endAngle: number
) {
  const sweep = Math.min(359.5, Math.max(1, endAngle - startAngle));
  const end = startAngle + sweep;
  const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p2 = polarToCartesian(cx, cy, rOuter, end);
  const p3 = polarToCartesian(cx, cy, rInner, end);
  const p4 = polarToCartesian(cx, cy, rInner, startAngle);
  const large = sweep > 180 ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
}

export function BudgetDashboardScreen() {
  const { budgets, categories, transactions, settings, closeSubScreen, openSubScreen } = useWallet();
  const isBn = settings.language === 'BANGLA';
  const monthKey = getMonthKey();

  const [showZeroSpend, setShowZeroSpend] = useState(false);
  const [selectedSliceName, setSelectedSliceName] = useState<string | null>(null);

  const monthData = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1);

    const spentByCategory = new Map<string, number>();
    let totalSpent = 0;

    for (const tx of transactions) {
      if (tx.timestamp >= start && isEligibleExpense(tx)) {
        totalSpent += tx.amount;
        const key = tx.category.trim().toLowerCase();
        spentByCategory.set(key, (spentByCategory.get(key) ?? 0) + tx.amount);
      }
    }

    const totalBudget = computeMonthlyBudgetTotal(budgets, monthKey);
    const activeBudgets = budgets.filter((b) => !b.monthYear || b.monthYear === monthKey);
    const overallBudget = activeBudgets.find((b) => b.isOverall);
    const categoryBudgets = activeBudgets.filter((b) => !b.isOverall && b.categoryName.trim() !== '');

    const budgetedSet = new Set(categoryBudgets.map((b) => b.categoryName.trim().toLowerCase()));
    const unbudgeted = categories
      .filter((c) => !c.isIncome && !c.isTransfer && !budgetedSet.has(c.name.trim().toLowerCase()))
      .map((c) => ({
        category: c,
        spent: spentByCategory.get(c.name.trim().toLowerCase()) ?? 0,
      }))
      .filter((item) => showZeroSpend || item.spent > 0)
      .sort((a, b) => b.spent - a.spent);

    return {
      totalSpent,
      totalBudget,
      daysLeft,
      spentByCategory,
      overallBudget,
      categoryBudgets,
      unbudgeted,
    };
  }, [budgets, categories, monthKey, showZeroSpend, transactions]);

  const remaining = monthData.totalBudget - monthData.totalSpent;
  const dailySafe = remaining > 0 ? remaining / monthData.daysLeft : 0;

  // Build Sunburst rings
  const sunburstSlices = useMemo(() => {
    const items = monthData.categoryBudgets.map((b) => {
      const catMeta = categories.find(
        (c) => c.name.toLowerCase() === b.categoryName.toLowerCase()
      );
      const spent = monthData.spentByCategory.get(b.categoryName.trim().toLowerCase()) ?? 0;
      return {
        name: b.name || b.categoryName,
        categoryName: b.categoryName,
        limit: b.monthlyLimit,
        spent,
        weight: Math.max(b.monthlyLimit, spent, 1),
        colorHex: b.colorHex || catMeta?.colorHex || '#0284C7',
      };
    });
    const totalWeight = items.reduce((a, b) => a + b.weight, 0);
    if (totalWeight <= 0) return [];
    let angle = 0;
    return items.map((item) => {
      const span = (item.weight / totalWeight) * 360;
      const spentRatio = item.limit > 0 ? Math.min(1, item.spent / item.limit) : 1;
      const spentSpan = span * spentRatio;
      const startAngle = angle;
      const endAngle = angle + span;
      angle += span;
      return {
        ...item,
        startAngle,
        endAngle,
        spentEndAngle: startAngle + spentSpan,
        isOver: item.spent > item.limit,
      };
    });
  }, [categories, monthData.categoryBudgets, monthData.spentByCategory]);

  const selectedSlice = sunburstSlices.find((s) => s.name === selectedSliceName) ?? null;

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader
        title={t('budget_dashboard', settings.language)}
        subtitle={t('current_month', settings.language)}
        onBack={closeSubScreen}
        rightAction={
          <button
            type="button"
            onClick={() => openSubScreen('ADD_BUDGET')}
            className="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-bold flex items-center gap-1"
          >
            <Plus size={14} /> {t('add', settings.language)}
          </button>
        }
      />

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-5">
        {/* Overall Summary */}
        <TranslucentCard className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-500">
                {t('monthly_spending_vs_limit', settings.language)}
              </p>
              <p className="text-2xl font-black font-mono-num text-slate-900 dark:text-white mt-0.5">
                {formatCurrency(monthData.totalSpent, settings.currencySymbol, settings.language)}
                <span className="text-sm font-semibold text-slate-500 ml-1.5">
                  / {formatCurrency(monthData.totalBudget, settings.currencySymbol, settings.language)}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                openSubScreen(
                  'ADD_BUDGET',
                  monthData.overallBudget
                    ? { budgetId: monthData.overallBudget.id }
                    : { isOverall: 'true' }
                )
              }
              className="px-3 py-1.5 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 text-xs font-bold"
            >
              {monthData.overallBudget
                ? t('edit_overall_budget', settings.language)
                : t('set_overall_limit', settings.language)}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-2xl bg-slate-100/80 dark:bg-slate-800/70 p-3">
              <p className="text-[11px] text-slate-500">
                {remaining >= 0 ? t('remaining_label', settings.language) : t('over_label', settings.language)}
              </p>
              <p
                className={`text-base font-extrabold font-mono-num ${
                  remaining >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatCurrency(Math.abs(remaining), settings.currencySymbol, settings.language)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-100/80 dark:bg-slate-800/70 p-3">
              <p className="text-[11px] text-slate-500">
                {t('daily_safe_spend', settings.language)} ({monthData.daysLeft}{' '}
                {t('days_left', settings.language)})
              </p>
              <p className="text-base font-extrabold font-mono-num text-sky-600">
                {formatCurrency(dailySafe, settings.currencySymbol, settings.language)}{' '}
                <span className="text-[10px] font-semibold">{t('per_day', settings.language)}</span>
              </p>
            </div>
          </div>
        </TranslucentCard>

        {/* Interactive 2-Ring SVG Sunburst Chart */}
        <TranslucentCard className="p-4 space-y-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('spending_distribution', settings.language)}
            </h2>
            <p className="text-[11px] text-slate-500">{t('sunburst_subtitle', settings.language)}</p>
          </div>

          {sunburstSlices.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              {t('sunburst_empty', settings.language)}
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <div className="relative w-52 h-52 shrink-0">
                <svg viewBox="0 0 220 220" className="w-full h-full">
                  {sunburstSlices.map((s) => {
                    const isSel = selectedSliceName === s.name;
                    return (
                      <g
                        key={s.name}
                        className="cursor-pointer"
                        onClick={() => setSelectedSliceName(isSel ? null : s.name)}
                      >
                        {/* Inner Ring: Allocated Limit */}
                        <path
                          d={describeArc(110, 110, 46, 72, s.startAngle + 0.8, s.endAngle - 0.8)}
                          fill={s.colorHex}
                          opacity={isSel ? 1 : 0.82}
                        />
                        {/* Outer Ring Track: Headroom */}
                        <path
                          d={describeArc(110, 110, 76, 98, s.startAngle + 0.8, s.endAngle - 0.8)}
                          fill={s.colorHex}
                          opacity="0.2"
                        />
                        {/* Outer Ring Fill: Actual Spending */}
                        {s.spent > 0 && (
                          <path
                            d={describeArc(
                              110,
                              110,
                              76,
                              98,
                              s.startAngle + 0.8,
                              Math.max(s.startAngle + 3, s.spentEndAngle - 0.8)
                            )}
                            fill={s.isOver ? '#EF4444' : s.colorHex}
                            opacity={isSel ? 1 : 0.9}
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-12">
                  <span className="text-[10px] font-bold text-slate-500 truncate max-w-full">
                    {selectedSlice ? selectedSlice.name : t('total_spent', settings.language)}
                  </span>
                  <span className="text-xs font-black font-mono-num text-slate-900 dark:text-white">
                    {formatCompactCurrency(
                      selectedSlice ? selectedSlice.spent : monthData.totalSpent,
                      settings.currencySymbol,
                      settings.language
                    )}
                  </span>
                </div>
              </div>

              <div className="flex-1 w-full space-y-2">
                {sunburstSlices.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => setSelectedSliceName(s.name)}
                    className={`w-full flex items-center justify-between text-xs p-2 rounded-xl transition ${
                      selectedSliceName === s.name
                        ? 'bg-sky-500/10'
                        : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.colorHex }}
                      />
                      <span className="font-bold truncate">{s.name}</span>
                    </div>
                    <span className="font-mono-num font-bold text-slate-600 dark:text-slate-300">
                      {formatCompactCurrency(s.spent, settings.currencySymbol, settings.language)} /{' '}
                      {formatCompactCurrency(s.limit, settings.currencySymbol, settings.language)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </TranslucentCard>

        {/* Active Budgets */}
        <div className="space-y-2.5">
          <SectionHeader title={t('active_budgets', settings.language)} />
          {monthData.categoryBudgets.length === 0 ? (
            <TranslucentCard className="p-4 text-xs text-slate-500 text-center">
              {t('no_budget_set', settings.language)}
            </TranslucentCard>
          ) : (
            <div className="space-y-2.5">
              {monthData.categoryBudgets.map((b) => {
                const spent =
                  monthData.spentByCategory.get(b.categoryName.trim().toLowerCase()) ?? 0;
                const pct =
                  b.monthlyLimit > 0 ? Math.min(100, Math.round((spent / b.monthlyLimit) * 100)) : 0;
                const over = spent > b.monthlyLimit;
                return (
                  <TranslucentCard
                    key={b.id}
                    onClick={() => openSubScreen('ADD_BUDGET', { budgetId: b.id })}
                    className="p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CategoryIcon
                          iconName={b.iconName || 'category'}
                          colorHex={b.colorHex || '#0284C7'}
                          size={36}
                          iconSize={17}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {b.name || b.categoryName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {formatCurrency(spent, settings.currencySymbol, settings.language)}{' '}
                            {t('spent_of', settings.language)}{' '}
                            {formatCurrency(b.monthlyLimit, settings.currencySymbol, settings.language)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-extrabold ${
                            over
                              ? 'text-rose-600'
                              : pct >= b.alertPercentage
                              ? 'text-amber-500'
                              : 'text-emerald-600'
                          }`}
                        >
                          {pct}%
                        </span>
                        <Edit3 size={14} className="text-slate-400" />
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${over ? 'bg-rose-500' : ''}`}
                        style={{
                          width: `${pct}%`,
                          backgroundColor: over ? undefined : b.colorHex || '#0284C7',
                        }}
                      />
                    </div>
                  </TranslucentCard>
                );
              })}
            </div>
          )}
        </div>

        {/* Unbudgeted Categories */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">
              {t('unbudgeted_categories', settings.language)}
            </h2>
            <button
              type="button"
              onClick={() => setShowZeroSpend((v) => !v)}
              className="text-xs font-semibold text-sky-600 flex items-center gap-1"
            >
              {showZeroSpend ? <EyeOff size={13} /> : <Eye size={13} />}
              <span>
                {showZeroSpend
                  ? t('hide_zero_spend_categories', settings.language)
                  : t('show_zero_spend_categories', settings.language)}
              </span>
            </button>
          </div>
          <TranslucentCard className="divide-y divide-slate-200/60 dark:divide-white/10">
            {monthData.unbudgeted.length === 0 ? (
              <div className="p-4 text-xs text-slate-500 text-center">
                {isBn ? 'কোনো আনবাজেটেড ব্যয় নেই' : 'No unbudgeted spending this month'}
              </div>
            ) : (
              monthData.unbudgeted.map(({ category, spent }) => (
                <div key={category.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CategoryIcon
                      iconName={category.iconName}
                      colorHex={category.colorHex}
                      size={36}
                      iconSize={17}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {isBn ? category.nameBn : category.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono-num">
                        {formatCurrency(spent, settings.currencySymbol, settings.language)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openSubScreen('ADD_BUDGET', { categoryName: category.name })}
                    className="px-3 py-1.5 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 text-xs font-bold shrink-0"
                  >
                    {t('set_limit', settings.language)}
                  </button>
                </div>
              ))
            )}
          </TranslucentCard>
        </div>
      </div>
    </div>
  );
}
