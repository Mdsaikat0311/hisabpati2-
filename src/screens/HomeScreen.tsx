import React, { useMemo, useState } from 'react';
import {
  Bell,
  Settings,
  SlidersHorizontal,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  CreditCard,
  Sparkles,
  Flame,
  CalendarClock,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  X,
  Database,
  Mic,
  FileText,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import {
  calculateNetWorthSummary,
  computeMonthlyBudgetTotal,
  computeSpendingByDayOfWeek,
  computeSpendingStreakDays,
  isEligibleExpense,
  isEligibleIncome,
} from '../utils/analytics';
import { formatCurrency, formatDayHeader, formatTime, getMonthKey } from '../utils/formatters';
import { HishabPatiAccountCard } from '../components/HishabPatiAccountCard';
import { TranslucentCard, SectionHeader } from '../components/GlassPrimitives';
import { CategoryIcon } from '../components/CategoryIcon';
import { getThemeColors } from '../data/categoryCatalog';
import type { HomeSectionKey } from '../types/models';

const SECTION_LABELS: Record<HomeSectionKey, { en: string; bn: string }> = {
  budget: { en: 'Monthly Budget', bn: 'মাসিক বাজেট' },
  bills: { en: 'Recurring & Card Bills', bn: 'বিল ও কার্ডের তারিখ' },
  recent_activity: { en: 'Recent Activity', bn: 'সাম্প্রতিক লেনদেন' },
  savings: { en: 'Savings Goals', bn: 'সঞ্চয় লক্ষ্য' },
  financial_health: { en: 'Financial Health', bn: 'আর্থিক স্বাস্থ্য' },
  smart_insights: { en: 'Smart Insights', bn: 'স্মার্ট ইনসাইটস' },
  top_spending: { en: 'Top Spending', bn: 'শীর্ষ ব্যয়' },
  spending_by_day: { en: 'Spending by Day', bn: 'দিনভিত্তিক ব্যয়' },
  spending_streak: { en: 'Tracking Streak', bn: 'ট্র্যাকিং স্ট্রিক' },
  shortcuts: { en: 'Quick Shortcuts', bn: 'কুইক শর্টকাট' },
};

export function HomeScreen() {
  const {
    settings,
    extendedSettings,
    accounts,
    transactions,
    categories,
    budgets,
    savingsGoals,
    homeCustomization,
    unreadNotificationsCount,
    openSubScreen,
    openAddTransaction,
    navigateToTab,
    updateHomeCustomization,
    resetHomeCustomization,
    loadSampleDataset,
  } = useWallet();

  const isBn = settings.language === 'BANGLA';
  const accent = getThemeColors(settings.themeColor);
  const [showCustomize, setShowCustomize] = useState(false);
  const [stackTopIdx, setStackTopIdx] = useState(0);

  const visibleAccounts = useMemo(
    () => accounts.filter((a) => !a.isHidden).sort((a, b) => a.sortOrder - b.sortOrder),
    [accounts]
  );

  const netWorth = useMemo(() => calculateNetWorthSummary(accounts), [accounts]);
  const currentMonthKey = getMonthKey();

  const monthStats = useMemo(() => {
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (tx.timestamp < mStart) continue;
      if (isEligibleIncome(tx)) income += tx.amount;
      else if (isEligibleExpense(tx)) expense += tx.amount;
    }
    return { income, expense };
  }, [transactions]);

  const monthlyBudgetLimit = useMemo(
    () => computeMonthlyBudgetTotal(budgets, currentMonthKey),
    [budgets, currentMonthKey]
  );

  const topCategories = useMemo(() => {
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const map = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.timestamp >= mStart && isEligibleExpense(tx)) {
        map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount);
      }
    }
    return Array.from(map.entries())
      .map(([name, amount]) => {
        const meta = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
        return {
          name,
          nameBn: meta?.nameBn || name,
          amount,
          colorHex: meta?.colorHex || accent.primary,
          iconName: meta?.iconName || 'category',
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [accent.primary, categories, transactions]);

  const upcomingBills = useMemo(() => {
    const ccBills = accounts
      .filter((a) => !a.isHidden && a.type === 'CREDIT_CARD' && a.paymentDueDate.trim())
      .map((a) => ({
        id: `cc_${a.id}`,
        title: `${a.name} (${isBn ? 'কার্ড বিল' : 'Card Due'})`,
        sub: a.paymentDueDate,
        amount: a.balance < 0 ? Math.abs(a.balance) : a.minPayment,
        accountId: a.id,
      }));
    const recurring = transactions
      .filter((tx) => tx.isRecurring)
      .slice(0, 3)
      .map((tx) => ({
        id: `rec_${tx.id}`,
        title: tx.title || tx.category,
        sub: formatDayHeader(tx.timestamp, settings.language),
        amount: tx.amount,
        accountId: tx.accountId,
      }));
    return [...ccBills, ...recurring].slice(0, 4);
  }, [accounts, isBn, settings.language, transactions]);

  const spendingByDay = useMemo(
    () => computeSpendingByDayOfWeek(transactions, isBn),
    [isBn, transactions]
  );
  const streakDays = useMemo(() => computeSpendingStreakDays(transactions), [transactions]);

  const displayName =
    extendedSettings.profileCustomName.trim() || settings.userName || 'User';

  const greetingText = (() => {
    const hr = new Date().getHours();
    if (isBn) {
      if (hr < 12) return 'শুভ সকাল';
      if (hr < 17) return 'শুভ অপরাহ্ণ';
      return 'শুভ সন্ধ্যা';
    }
    if (hr < 12) return 'Good Morning';
    if (hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  const toggleSectionVisibility = (key: HomeSectionKey) => {
    const curr = homeCustomization.visibleSections;
    const next = curr.includes(key) ? curr.filter((k) => k !== key) : [...curr, key];
    updateHomeCustomization({ visibleSections: next });
  };

  const moveSectionOrder = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= homeCustomization.sectionOrder.length) return;
    const next = [...homeCustomization.sectionOrder];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    updateHomeCustomization({ sectionOrder: next });
  };

  const renderSection = (key: HomeSectionKey) => {
    if (!homeCustomization.visibleSections.includes(key)) return null;

    switch (key) {
      case 'budget': {
        const pct =
          monthlyBudgetLimit > 0
            ? Math.min(100, Math.round((monthStats.expense / monthlyBudgetLimit) * 100))
            : 0;
        const over = monthlyBudgetLimit > 0 && monthStats.expense > monthlyBudgetLimit;
        return (
          <div key={key}>
            <SectionHeader
              title={t('monthly_budget', settings.language)}
              actionLabel={t('manage_budget', settings.language)}
              onAction={() => openSubScreen('BUDGET_DASHBOARD')}
            />
            <TranslucentCard
              className="p-4 space-y-2.5"
              onClick={() => openSubScreen('BUDGET_DASHBOARD')}
            >
              {monthlyBudgetLimit > 0 ? (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {formatCurrency(monthStats.expense, settings.currencySymbol, settings.language)}{' '}
                      {t('of', settings.language)}{' '}
                      {formatCurrency(monthlyBudgetLimit, settings.currencySymbol, settings.language)}
                    </span>
                    <span
                      className={`font-bold ${
                        over
                          ? 'text-red-500'
                          : pct > 80
                          ? 'text-amber-500'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        over ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {over
                      ? `${t('over_by', settings.language)} ${formatCurrency(
                          monthStats.expense - monthlyBudgetLimit,
                          settings.currencySymbol,
                          settings.language
                        )}`
                      : `${t('remaining_budget', settings.language)}: ${formatCurrency(
                          Math.max(0, monthlyBudgetLimit - monthStats.expense),
                          settings.currencySymbol,
                          settings.language
                        )}`}
                  </p>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {t('no_budget_set', settings.language)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('monthly_budget_desc', settings.language)}
                    </p>
                  </div>
                  <span className="px-3 py-1.5 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 text-xs font-bold shrink-0">
                    {t('set_budget', settings.language)}
                  </span>
                </div>
              )}
            </TranslucentCard>
          </div>
        );
      }

      case 'bills':
        return (
          <div key={key}>
            <SectionHeader
              title={isBn ? 'বিল ও কার্ডের তারিখ' : 'Upcoming Bills & Cards'}
              actionLabel={t('calendar', settings.language)}
              onAction={() => openSubScreen('CALENDAR')}
            />
            <TranslucentCard className="p-4">
              {upcomingBills.length === 0 ? (
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {isBn
                      ? 'কোনো আসন্ন বিল বা ক্রেডিট কার্ডের শেষ তারিখ নেই'
                      : 'No recurring bills or credit card due dates scheduled'}
                  </span>
                  <CalendarClock size={18} className="text-slate-400 shrink-0" />
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingBills.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => openSubScreen('ACCOUNT_DETAIL', { accountId: b.accountId })}
                      className="flex items-center justify-between gap-2 py-1 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {b.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{b.sub}</p>
                      </div>
                      <span className="text-sm font-bold font-mono-num text-slate-900 dark:text-white shrink-0">
                        {formatCurrency(b.amount, settings.currencySymbol, settings.language)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TranslucentCard>
          </div>
        );

      case 'recent_activity': {
        const recent = [...transactions].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
        return (
          <div key={key}>
            <SectionHeader
              title={t('recent_transactions', settings.language)}
              actionLabel={t('view_all', settings.language)}
              onAction={() => navigateToTab('ACTIVITY')}
            />
            <TranslucentCard className="divide-y divide-slate-200/60 dark:divide-white/10">
              {recent.length === 0 ? (
                <div className="p-6 text-center space-y-2">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {t('no_transactions_yet', settings.language)}
                  </p>
                  <button
                    type="button"
                    onClick={() => openAddTransaction()}
                    className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold"
                  >
                    + {t('add', settings.language)}
                  </button>
                </div>
              ) : (
                recent.map((tx) => {
                  const cat = categories.find(
                    (c) => c.name.toLowerCase() === tx.category.toLowerCase()
                  );
                  const acc = accounts.find((a) => a.id === tx.accountId);
                  const isIn = tx.type === 'INCOME' || tx.type === 'BORROW';
                  const isTr = tx.type === 'TRANSFER' || tx.type === 'CC_PAYMENT';
                  return (
                    <div
                      key={tx.id}
                      onClick={() => openAddTransaction({ editingTx: tx })}
                      className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-white/5 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CategoryIcon
                          iconName={cat?.iconName || (isTr ? 'swap_horiz' : 'category')}
                          colorHex={cat?.colorHex || (isIn ? '#10B981' : '#0284C7')}
                          size={40}
                          iconSize={18}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {tx.title || (isBn && cat?.nameBn ? cat.nameBn : tx.category)}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {acc?.name || t('account', settings.language)} •{' '}
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
                })
              )}
            </TranslucentCard>
          </div>
        );
      }

      case 'savings':
        return (
          <div key={key}>
            <SectionHeader
              title={t('savings_goals', settings.language)}
              actionLabel={t('add_goal', settings.language)}
              onAction={() => openSubScreen('NEW_SAVINGS_GOAL')}
            />
            <TranslucentCard className="p-4 space-y-3">
              {savingsGoals.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('no_savings_goals', settings.language)}
                </p>
              ) : (
                savingsGoals.slice(0, 3).map((g) => {
                  const pct =
                    g.targetAmount > 0
                      ? Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100))
                      : 0;
                  return (
                    <div
                      key={g.id}
                      onClick={() => navigateToTab('PLAN')}
                      className="space-y-1.5 cursor-pointer"
                    >
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-900 dark:text-white">{g.name}</span>
                        <span className="font-mono-num text-slate-600 dark:text-slate-300">
                          {pct}% ({formatCurrency(g.savedAmount, settings.currencySymbol, settings.language)})
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: g.themeColorHex || accent.primary,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </TranslucentCard>
          </div>
        );

      case 'financial_health': {
        const savingsRate =
          monthStats.income > 0
            ? Math.round(((monthStats.income - monthStats.expense) / monthStats.income) * 100)
            : 0;
        const grade =
          monthStats.income === 0 && monthStats.expense === 0
            ? '-'
            : savingsRate >= 30
            ? 'A+'
            : savingsRate >= 15
            ? 'A'
            : savingsRate >= 0
            ? 'B'
            : 'C';
        return (
          <div key={key}>
            <SectionHeader
              title={t('financial_health', settings.language)}
              actionLabel={t('monthly_recap', settings.language)}
              onAction={() => openSubScreen('MONTHLY_RECAP')}
            />
            <TranslucentCard className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('savings_rate', settings.language)}
                </p>
                <p className="text-xl font-extrabold font-mono-num text-slate-900 dark:text-white">
                  {savingsRate}%
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {savingsRate >= 15
                    ? t('healthy_savings_rate', settings.language)
                    : savingsRate < 0
                    ? t('expenses_exceeded_income', settings.language)
                    : t('balanced_monthly_cashflow', settings.language)}
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shrink-0"
                style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.secondary})` }}
              >
                {grade}
              </div>
            </TranslucentCard>
          </div>
        );
      }

      case 'smart_insights': {
        const diff = monthStats.income - monthStats.expense;
        return (
          <div key={key}>
            <SectionHeader
              title={t('insights', settings.language)}
              actionLabel={t('details', settings.language)}
              onAction={() => navigateToTab('INSIGHTS')}
            />
            <TranslucentCard className="p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                <Sparkles size={18} />
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">
                  {diff >= 0
                    ? isBn
                      ? 'এই মাসে আপনার সঞ্চয় ইতিবাচক অবস্থানে আছে'
                      : 'Positive cashflow this month'
                    : isBn
                    ? 'এই মাসে আয়ের চেয়ে ব্যয় বেশি হয়েছে'
                    : 'Monthly expenses exceed income'}
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  {isBn ? 'নেট পার্থক্য:' : 'Net flow:'}{' '}
                  <strong className="font-mono-num text-slate-800 dark:text-slate-200">
                    {formatCurrency(diff, settings.currencySymbol, settings.language, true)}
                  </strong>
                </p>
              </div>
            </TranslucentCard>
          </div>
        );
      }

      case 'top_spending':
        return (
          <div key={key}>
            <SectionHeader title={t('top_spending', settings.language)} />
            <TranslucentCard className="p-4 space-y-2.5">
              {topCategories.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('no_expenses_this_month', settings.language)}
                </p>
              ) : (
                topCategories.map((c) => (
                  <div key={c.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CategoryIcon iconName={c.iconName} colorHex={c.colorHex} size={32} iconSize={16} />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {isBn ? c.nameBn : c.name}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold font-mono-num text-slate-900 dark:text-white">
                      {formatCurrency(c.amount, settings.currencySymbol, settings.language)}
                    </span>
                  </div>
                ))
              )}
            </TranslucentCard>
          </div>
        );

      case 'spending_by_day': {
        const maxVal = Math.max(1, ...spendingByDay.map((d) => d.amount));
        return (
          <div key={key}>
            <SectionHeader title={t('spending_by_day', settings.language)} />
            <TranslucentCard className="p-4">
              <div className="grid grid-cols-7 gap-2 items-end h-28 pt-2">
                {spendingByDay.map((d) => {
                  const h = Math.max(8, Math.round((d.amount / maxVal) * 80));
                  return (
                    <div key={d.label} className="flex flex-col items-center justify-end gap-1.5 h-full">
                      <div
                        className="w-full max-w-[22px] rounded-t-lg transition-all"
                        style={{
                          height: `${h}%`,
                          background: `linear-gradient(180deg, ${accent.primary}, ${accent.secondary})`,
                          opacity: d.amount > 0 ? 1 : 0.2,
                        }}
                        title={formatCurrency(d.amount, settings.currencySymbol, settings.language)}
                      />
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {d.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </TranslucentCard>
          </div>
        );
      }

      case 'spending_streak':
        return (
          <div key={key}>
            <TranslucentCard className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/15 text-orange-500 flex items-center justify-center">
                  <Flame size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {isBn ? 'দৈনিক ট্র্যাকিং স্ট্রিক' : 'Daily Logging Streak'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {streakDays}{' '}
                    {isBn ? 'দিন একটানা লেনদেন যুক্ত হয়েছে' : 'consecutive days logged'}
                  </p>
                </div>
              </div>
              <span className="text-2xl font-black font-mono-num text-orange-500">{streakDays}d</span>
            </TranslucentCard>
          </div>
        );

      case 'shortcuts':
        return (
          <div key={key}>
            <SectionHeader title={t('quick_shortcuts', settings.language)} />
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: t('currency_converter', settings.language), screen: 'CURRENCY_CONVERTER' as const },
                { label: t('manage_debts', settings.language), screen: 'MANAGE_DEBTS' as const },
                { label: t('backup_restore', settings.language), screen: 'BACKUP_RESTORE' as const },
              ].map((s) => (
                <TranslucentCard
                  key={s.screen}
                  onClick={() => openSubScreen(s.screen)}
                  className="p-3 text-center text-xs font-bold text-slate-800 dark:text-slate-100"
                >
                  {s.label}
                </TranslucentCard>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pt-5 pb-28 space-y-5">
      {/* Top Bar */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => openSubScreen('PROFILE')}
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-extrabold text-base shadow-md shrink-0"
            style={{ backgroundColor: extendedSettings.profileAvatarBgHex || accent.primary }}
          >
            {displayName.charAt(0).toUpperCase()}
          </button>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {greetingText}
            </p>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
              {displayName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowCustomize(true)}
            aria-label={t('customize_home', settings.language)}
            className="w-10 h-10 rounded-2xl glass-card flex items-center justify-center text-slate-700 dark:text-slate-200 hover:scale-105 transition"
          >
            <SlidersHorizontal size={18} />
          </button>
          <button
            type="button"
            onClick={() => openSubScreen('NOTIFICATIONS')}
            aria-label={t('notifications', settings.language)}
            className="relative w-10 h-10 rounded-2xl glass-card flex items-center justify-center text-slate-700 dark:text-slate-200 hover:scale-105 transition"
          >
            <Bell size={18} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => openSubScreen('SETTINGS')}
            aria-label={t('settings_title', settings.language)}
            className="w-10 h-10 rounded-2xl glass-card flex items-center justify-center text-slate-700 dark:text-slate-200 hover:scale-105 transition"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Net Worth / Total Balance Card */}
      <TranslucentCard
        className={`p-5 relative overflow-hidden ${
          homeCustomization.balanceCardStyle === 'GRADIENT' ? 'text-white border-0' : ''
        }`}
      >
        {homeCustomization.balanceCardStyle === 'GRADIENT' && (
          <div
            className="absolute inset-0 -z-0"
            style={{
              background: `linear-gradient(135deg, ${accent.primary}, ${accent.secondary} 60%, #0F172A 130%)`,
            }}
          />
        )}
        <div className="relative z-10 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className={`text-xs font-semibold uppercase tracking-wider ${
                  homeCustomization.balanceCardStyle === 'GRADIENT'
                    ? 'text-white/80'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {t('net_worth', settings.language)}
              </p>
              <p
                className={`text-3xl font-black font-mono-num tracking-tight mt-0.5 ${
                  homeCustomization.balanceCardStyle === 'GRADIENT'
                    ? 'text-white'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {formatCurrency(netWorth.netWorth, settings.currencySymbol, settings.language)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openSubScreen('ACCOUNTS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 ${
                homeCustomization.balanceCardStyle === 'GRADIENT'
                  ? 'bg-white/20 text-white'
                  : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
              }`}
            >
              <span>{t('accounts', settings.language)}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div
              className={`rounded-2xl p-3 ${
                homeCustomization.balanceCardStyle === 'GRADIENT'
                  ? 'bg-white/15'
                  : 'bg-emerald-500/10 border border-emerald-500/15'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                <ArrowDownLeft
                  size={14}
                  className={
                    homeCustomization.balanceCardStyle === 'GRADIENT'
                      ? 'text-emerald-200'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }
                />
                <span>{t('money_in', settings.language)}</span>
              </div>
              <p className="text-base font-extrabold font-mono-num mt-1">
                {formatCurrency(monthStats.income, settings.currencySymbol, settings.language)}
              </p>
            </div>

            <div
              className={`rounded-2xl p-3 ${
                homeCustomization.balanceCardStyle === 'GRADIENT'
                  ? 'bg-white/15'
                  : 'bg-rose-500/10 border border-rose-500/15'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                <ArrowUpRight
                  size={14}
                  className={
                    homeCustomization.balanceCardStyle === 'GRADIENT'
                      ? 'text-rose-200'
                      : 'text-rose-600 dark:text-rose-400'
                  }
                />
                <span>{t('money_out', settings.language)}</span>
              </div>
              <p className="text-base font-extrabold font-mono-num mt-1">
                {formatCurrency(monthStats.expense, settings.currencySymbol, settings.language)}
              </p>
            </div>
          </div>
        </div>
      </TranslucentCard>

      {/* Quick Action Strip */}
      <div className="grid grid-cols-4 gap-2">
        {[
          {
            label: t('expense', settings.language),
            icon: Plus,
            color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
            onClick: () => openAddTransaction({ initialType: 'EXPENSE' }),
          },
          {
            label: t('transfer', settings.language),
            icon: ArrowLeftRight,
            color: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
            onClick: () => openAddTransaction({ initialType: 'TRANSFER' }),
          },
          {
            label: t('voice_entry', settings.language),
            icon: Mic,
            color: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
            onClick: () => openAddTransaction({ initialMode: 'voice' }),
          },
          {
            label: t('scan_receipt', settings.language),
            icon: FileText,
            color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
            onClick: () => openAddTransaction({ initialMode: 'receipt' }),
          },
        ].map((btn) => {
          const Icon = btn.icon;
          return (
            <button
              key={btn.label}
              type="button"
              onClick={btn.onClick}
              className="glass-card rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-95 transition"
            >
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${btn.color}`}>
                <Icon size={17} />
              </span>
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate max-w-full">
                {btn.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Wallet Card Stack or Horizontal Carousel */}
      <div>
        <SectionHeader
          title={t('accounts', settings.language)}
          actionLabel={t('view_all', settings.language)}
          onAction={() => openSubScreen('ACCOUNTS')}
        />
        {visibleAccounts.length === 0 ? (
          <TranslucentCard className="p-6 text-center space-y-3">
            <CreditCard size={28} className="mx-auto text-sky-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isBn ? 'আপনার প্রথম ওয়ালেট যোগ করুন' : 'Add Your First Wallet'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isBn
                  ? 'ব্যাংক, বিকাশ/নগদ, ক্যাশ অথবা ক্রেডিট কার্ড যুক্ত করে হিসাব শুরু করুন।'
                  : 'Track Bank cards, bKash/Nagad MFS wallets, Cash, or Credit Cards.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => openSubScreen('EDIT_ACCOUNT')}
                className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold"
              >
                + {t('add_account', settings.language)}
              </button>
              <button
                type="button"
                onClick={loadSampleDataset}
                className="px-4 py-2 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5"
              >
                <Database size={13} />
                {isBn ? 'নমুনা ডেটা লোড করুন' : 'Load Sample Data'}
              </button>
            </div>
          </TranslucentCard>
        ) : homeCustomization.cardStyle === 'CAROUSEL' ? (
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
            {visibleAccounts.map((acc) => (
              <div key={acc.id} className="w-[84%] sm:w-[320px] shrink-0 snap-start">
                <HishabPatiAccountCard
                  account={acc}
                  currencySymbol={settings.currencySymbol}
                  language={settings.language}
                  onClick={() => openSubScreen('ACCOUNT_DETAIL', { accountId: acc.id })}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {(() => {
              const safeIdx = stackTopIdx % visibleAccounts.length;
              const frontAcc = visibleAccounts[safeIdx];
              const nextAcc = visibleAccounts.length > 1 ? visibleAccounts[(safeIdx + 1) % visibleAccounts.length] : null;
              return (
                <div className="relative">
                  {nextAcc && (
                    <div
                      onClick={() => setStackTopIdx((i) => (i + 1) % visibleAccounts.length)}
                      className="mx-3 -mb-10 h-14 rounded-t-[20px] px-4 pt-2 flex items-start justify-between text-white/90 text-xs font-bold cursor-pointer opacity-85"
                      style={{ backgroundColor: nextAcc.colorHex || '#0284C7' }}
                    >
                      <span>{nextAcc.name}</span>
                      <span>
                        {visibleAccounts.length} {isBn ? 'টি কার্ড • পরিবর্তন করতে ট্যাপ' : 'cards • tap to cycle'}
                      </span>
                    </div>
                  )}
                  <HishabPatiAccountCard
                    account={frontAcc}
                    currencySymbol={settings.currencySymbol}
                    language={settings.language}
                    onClick={() => openSubScreen('ACCOUNT_DETAIL', { accountId: frontAcc.id })}
                  />
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Ordered Customizable Home Sections */}
      <div className="space-y-5">
        {homeCustomization.sectionOrder.map((sectionKey) => renderSection(sectionKey))}
      </div>

      {/* Customize Home Modal */}
      {showCustomize && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('customize_home', settings.language)}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetHomeCustomization}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold flex items-center gap-1 text-slate-600 dark:text-slate-300"
                >
                  <RotateCcw size={13} /> {isBn ? 'রিসেট' : 'Reset'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomize(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Card Display Style */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('card_display_style', settings.language)}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(['STACK', 'CAROUSEL'] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => updateHomeCustomization({ cardStyle: style })}
                      className={`p-3 rounded-2xl border text-left transition ${
                        homeCustomization.cardStyle === style
                          ? 'border-sky-500 bg-sky-500/10'
                          : 'border-slate-200 dark:border-white/10'
                      }`}
                    >
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {style === 'STACK'
                          ? t('home_style_card_stack', settings.language)
                          : t('home_style_card_carousel', settings.language)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {style === 'STACK'
                          ? t('home_style_card_stack_subtitle', settings.language)
                          : t('home_style_card_carousel_subtitle', settings.language)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Balance Card Style */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {isBn ? 'ব্যালেন্স কার্ড স্টাইল' : 'Balance Hero Style'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(['STANDARD', 'GRADIENT'] as const).map((bStyle) => (
                    <button
                      key={bStyle}
                      type="button"
                      onClick={() => updateHomeCustomization({ balanceCardStyle: bStyle })}
                      className={`p-3 rounded-2xl border text-xs font-bold transition ${
                        homeCustomization.balanceCardStyle === bStyle
                          ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                          : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {bStyle === 'STANDARD'
                        ? isBn
                          ? 'ফ্রস্টেড গ্লাস'
                          : 'Frosted Glass'
                        : isBn
                        ? 'গ্রেডিয়েন্ট কার্ড'
                        : 'Accent Gradient'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section Order & Toggles */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('toggle_sections', settings.language)}
                </p>
                <div className="space-y-2">
                  {homeCustomization.sectionOrder.map((sec, idx) => {
                    const enabled = homeCustomization.visibleSections.includes(sec);
                    return (
                      <div
                        key={sec}
                        className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/10"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveSectionOrder(idx, -1)}
                              className="text-slate-400 hover:text-slate-700 disabled:opacity-25"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === homeCustomization.sectionOrder.length - 1}
                              onClick={() => moveSectionOrder(idx, 1)}
                              className="text-slate-400 hover:text-slate-700 disabled:opacity-25"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {isBn ? SECTION_LABELS[sec].bn : SECTION_LABELS[sec].en}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleSectionVisibility(sec)}
                          className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                            enabled ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                              enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
