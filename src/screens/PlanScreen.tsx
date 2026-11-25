import React, { useMemo, useState } from 'react';
import {
  PiggyBank,
  HandCoins,
  Target,
  ArrowRightLeft,
  Landmark,
  BarChart3,
  GitCompare,
  TrendingUp,
  CalendarDays,
  Plus,
  X,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import {
  calculateNetWorthSummary,
  computeMonthlyBudgetTotal,
  getDebtRemaining,
  isEligibleExpense,
} from '../utils/analytics';
import { formatCurrency, getMonthKey } from '../utils/formatters';
import { TranslucentCard, SectionHeader } from '../components/GlassPrimitives';
import { CategoryIcon } from '../components/CategoryIcon';
import { getThemeColors } from '../data/categoryCatalog';
import type { SavingsGoalEntity } from '../types/models';

export function PlanScreen() {
  const {
    settings,
    accounts,
    transactions,
    budgets,
    debts,
    savingsGoals,
    openSubScreen,
    contributeToGoal,
  } = useWallet();
  const isBn = settings.language === 'BANGLA';
  const accent = getThemeColors(settings.themeColor);

  const [contribGoal, setContribGoal] = useState<SavingsGoalEntity | null>(null);
  const [contribAmount, setContribAmount] = useState('');
  const [contribAccountId, setContribAccountId] = useState<string>(accounts[0]?.id ?? '');

  const netWorth = useMemo(() => calculateNetWorthSummary(accounts), [accounts]);
  const monthKey = getMonthKey();
  const monthlyBudget = useMemo(
    () => computeMonthlyBudgetTotal(budgets, monthKey),
    [budgets, monthKey]
  );

  const monthlySpent = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return transactions
      .filter((tx) => tx.timestamp >= start && isEligibleExpense(tx))
      .reduce((acc, tx) => acc + tx.amount, 0);
  }, [transactions]);

  const debtTotals = useMemo(() => {
    let lent = 0;
    let borrowed = 0;
    for (const d of debts) {
      if (d.isSettled) continue;
      if (d.type === 'LENT') lent += getDebtRemaining(d);
      else borrowed += getDebtRemaining(d);
    }
    return { lent, borrowed, activeCount: debts.filter((d) => !d.isSettled).length };
  }, [debts]);

  const tools = [
    {
      label: t('converter', settings.language),
      icon: ArrowRightLeft,
      color: '#0284C7',
      onClick: () => openSubScreen('CURRENCY_CONVERTER'),
    },
    {
      label: t('networth', settings.language),
      icon: Landmark,
      color: '#10B981',
      onClick: () => openSubScreen('ACCOUNTS'),
    },
    {
      label: t('monthly_recap', settings.language),
      icon: BarChart3,
      color: '#8B5CF6',
      onClick: () => openSubScreen('MONTHLY_RECAP'),
    },
    {
      label: t('spending_comparison', settings.language),
      icon: GitCompare,
      color: '#F59E0B',
      onClick: () => openSubScreen('SPENDING_COMPARISON'),
    },
    {
      label: t('income_tracker', settings.language),
      icon: TrendingUp,
      color: '#0D9488',
      onClick: () => openSubScreen('INCOME_TRACKER'),
    },
    {
      label: t('calendar', settings.language),
      icon: CalendarDays,
      color: '#EC4899',
      onClick: () => openSubScreen('CALENDAR'),
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 pt-5 pb-28 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {t('plan_title', settings.language)}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('net_worth', settings.language)}:{' '}
            <strong className="font-mono-num text-slate-800 dark:text-slate-200">
              {formatCurrency(netWorth.netWorth, settings.currencySymbol, settings.language)}
            </strong>
          </p>
        </div>
      </header>

      {/* Savings Goals */}
      <div>
        <SectionHeader
          title={t('savings_goals', settings.language)}
          actionLabel={t('add_goal', settings.language)}
          onAction={() => openSubScreen('NEW_SAVINGS_GOAL')}
        />
        {savingsGoals.length === 0 ? (
          <TranslucentCard className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                <PiggyBank size={22} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('no_savings_goals', settings.language)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('create_goal_prompt', settings.language)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openSubScreen('NEW_SAVINGS_GOAL')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shrink-0"
            >
              {t('add', settings.language)}
            </button>
          </TranslucentCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {savingsGoals.map((goal) => {
              const pct =
                goal.targetAmount > 0
                  ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100))
                  : 0;
              return (
                <TranslucentCard key={goal.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CategoryIcon
                        iconName={goal.iconName || 'savings'}
                        colorHex={goal.themeColorHex || accent.primary}
                        size={38}
                        iconSize={18}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {goal.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {pct}% •{' '}
                          {formatCurrency(goal.targetAmount, settings.currencySymbol, settings.language)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setContribGoal(goal);
                        setContribAmount('');
                        setContribAccountId(accounts.find((a) => !a.isHidden)?.id ?? '');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center gap-1"
                    >
                      <Plus size={12} /> {isBn ? 'যোগ' : 'Add'}
                    </button>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: goal.themeColorHex || accent.primary,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>
                      {t('saved', settings.language)}:{' '}
                      <strong className="font-mono-num text-slate-800 dark:text-slate-200">
                        {formatCurrency(goal.savedAmount, settings.currencySymbol, settings.language)}
                      </strong>
                    </span>
                    {goal.targetDeadlineStr && <span>{goal.targetDeadlineStr}</span>}
                  </div>
                </TranslucentCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Loans & Debt */}
      <div>
        <SectionHeader
          title={t('loans_debt', settings.language)}
          actionLabel={t('explore_all', settings.language)}
          onAction={() => openSubScreen('MANAGE_DEBTS')}
        />
        <TranslucentCard
          className="p-4 space-y-3"
          onClick={() => openSubScreen('MANAGE_DEBTS')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                <HandCoins size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {debtTotals.activeCount} {t('active', settings.language)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('borrowed_and_lent_tracking', settings.language)}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
              {t('explore_all', settings.language)} →
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl p-3 bg-emerald-500/10">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold block">
                {t('owed_to_you', settings.language)}
              </span>
              <span className="text-base font-extrabold font-mono-num text-emerald-600 dark:text-emerald-400">
                {formatCurrency(debtTotals.lent, settings.currencySymbol, settings.language)}
              </span>
            </div>
            <div className="rounded-2xl p-3 bg-rose-500/10">
              <span className="text-[11px] text-rose-700 dark:text-rose-300 font-semibold block">
                {t('you_owe', settings.language)}
              </span>
              <span className="text-base font-extrabold font-mono-num text-rose-600 dark:text-rose-400">
                {formatCurrency(debtTotals.borrowed, settings.currencySymbol, settings.language)}
              </span>
            </div>
          </div>
        </TranslucentCard>
      </div>

      {/* Monthly Budget */}
      <div>
        <SectionHeader
          title={t('monthly_budget', settings.language)}
          actionLabel={t('manage_budget', settings.language)}
          onAction={() => openSubScreen('BUDGET_DASHBOARD')}
        />
        <TranslucentCard
          className="p-4 space-y-2.5"
          onClick={() => openSubScreen('BUDGET_DASHBOARD')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/15 text-sky-500 flex items-center justify-center">
                <Target size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {monthlyBudget > 0
                    ? formatCurrency(monthlyBudget, settings.currencySymbol, settings.language)
                    : t('no_budget_set_short', settings.language)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('total_spent', settings.language)}:{' '}
                  {formatCurrency(monthlySpent, settings.currencySymbol, settings.language)}
                </p>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 text-xs font-bold">
              {t('manage_budget', settings.language)}
            </span>
          </div>
          {monthlyBudget > 0 && (
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  monthlySpent > monthlyBudget ? 'bg-red-500' : 'bg-sky-500'
                }`}
                style={{
                  width: `${Math.min(100, Math.round((monthlySpent / monthlyBudget) * 100))}%`,
                }}
              />
            </div>
          )}
        </TranslucentCard>
      </div>

      {/* Tools Grid */}
      <div>
        <SectionHeader title={t('tools', settings.language)} />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <TranslucentCard
                key={tool.label}
                onClick={tool.onClick}
                className="p-4 flex items-center gap-3"
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${tool.color}18`, color: tool.color }}
                >
                  <Icon size={20} />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                  {tool.label}
                </span>
              </TranslucentCard>
            );
          })}
        </div>
      </div>

      {/* Contribute to Savings Goal Modal */}
      {contribGoal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isBn ? 'সঞ্চয়ে অর্থ যোগ করুন' : 'Contribute to Goal'}: {contribGoal.name}
              </h3>
              <button
                type="button"
                onClick={() => setContribGoal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>
            <input
              type="number"
              value={contribAmount}
              onChange={(e) => setContribAmount(e.target.value)}
              placeholder={t('amount', settings.language)}
              className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-base font-bold font-mono-num outline-none"
            />
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                {isBn ? 'উৎস ওয়ালেট (ঐচ্ছিক)' : 'Deduct from Wallet (Optional)'}
              </label>
              <select
                value={contribAccountId}
                onChange={(e) => setContribAccountId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm outline-none"
              >
                <option value="">{isBn ? 'ওয়ালেট ছাড়া শুধু লক্ষ্য আপডেট' : 'Do not deduct from wallet'}</option>
                {accounts
                  .filter((a) => !a.isHidden)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatCurrency(a.balance, settings.currencySymbol, settings.language)})
                    </option>
                  ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                const amt = parseFloat(contribAmount);
                if (!amt || amt <= 0) return;
                contributeToGoal(contribGoal.id, amt, contribAccountId || null);
                setContribGoal(null);
              }}
              className="w-full py-3 rounded-2xl bg-emerald-600 text-white text-sm font-bold"
            >
              {t('save', settings.language)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
