import type {
  AccountEntity,
  BudgetEntity,
  CategoryEntity,
  DebtEntity,
  InsightsPeriod,
  TransactionEntity,
} from '../types/models';
import { getMonthKey } from './formatters';

export const NON_EXPENSE_CATEGORIES = new Set([
  'debt repayment',
  'lend money',
  'adjustment',
  'reconciliation',
]);

export const NON_INCOME_CATEGORIES = new Set([
  'loan received',
  'adjustment',
  'reconciliation',
  'account adjustment',
  'cash adjustment',
]);

/**
 * Computes exact balance delta of a single transaction for a specific account.
 */
export function computeSingleTxBalanceDelta(tx: TransactionEntity, accountId: string): number {
  if (tx.accountId !== accountId && tx.toAccountId !== accountId) return 0;
  let delta = 0;
  if (tx.accountId === accountId) {
    if (tx.type === 'INCOME' || tx.type === 'BORROW') {
      delta += tx.amount;
    } else {
      delta -= tx.amount;
    }
  }
  if (tx.toAccountId === accountId && (tx.type === 'TRANSFER' || tx.type === 'CC_PAYMENT')) {
    delta += tx.amount;
  }
  return delta;
}

export function applyBalanceEffect(
  accounts: AccountEntity[],
  tx: TransactionEntity,
  reverse = false
): AccountEntity[] {
  const sign = reverse ? -1 : 1;
  return accounts.map((acc) => {
    const delta = computeSingleTxBalanceDelta(tx, acc.id);
    if (delta === 0) return acc;
    return { ...acc, balance: Math.round((acc.balance + delta * sign) * 100) / 100 };
  });
}

export function isEligibleExpense(tx: TransactionEntity): boolean {
  if (tx.type !== 'EXPENSE') return false;
  if (tx.notes.includes('[EXCLUDE_BUDGET]')) return false;
  const catLower = tx.category.trim().toLowerCase();
  return !NON_EXPENSE_CATEGORIES.has(catLower);
}

export function isEligibleIncome(tx: TransactionEntity): boolean {
  if (tx.type !== 'INCOME') return false;
  const catLower = tx.category.trim().toLowerCase();
  return !NON_INCOME_CATEGORIES.has(catLower);
}

export function computeMonthlyBudgetTotal(
  budgets: BudgetEntity[],
  monthKey = getMonthKey()
): number {
  const monthBudgets = budgets.filter((b) => !b.monthYear || b.monthYear === monthKey);
  const categorySpecific = monthBudgets.filter((b) => !b.isOverall && b.categoryName.trim() !== '');
  if (categorySpecific.length > 0) {
    const grouped = new Map<string, BudgetEntity[]>();
    for (const b of categorySpecific) {
      const k = b.categoryName.trim().toLowerCase();
      const arr = grouped.get(k) ?? [];
      arr.push(b);
      grouped.set(k, arr);
    }
    let total = 0;
    for (const items of grouped.values()) {
      const subs = items.filter((i) => i.subcategoryName.trim() !== '');
      if (subs.length > 0) {
        total += subs.reduce((acc, s) => acc + s.monthlyLimit, 0);
      } else {
        total += items.reduce((acc, c) => acc + c.monthlyLimit, 0);
      }
    }
    return total;
  }
  const overall = monthBudgets.find((b) => b.isOverall);
  return overall?.monthlyLimit ?? 0;
}

export function calculateNetWorthSummary(accounts: AccountEntity[]): {
  assets: number;
  liabilities: number;
  netWorth: number;
} {
  let assets = 0;
  let liabilities = 0;
  for (const acc of accounts) {
    if (!acc.includeInTotal || acc.isHidden) continue;
    if (acc.type === 'CREDIT_CARD') {
      if (acc.balance < 0) liabilities += Math.abs(acc.balance);
      else assets += acc.balance;
    } else {
      if (acc.balance >= 0) assets += acc.balance;
      else liabilities += Math.abs(acc.balance);
    }
  }
  return {
    assets,
    liabilities,
    netWorth: assets - liabilities,
  };
}

export function getDebtRemaining(d: DebtEntity): number {
  if (d.isSettled) return 0;
  const rem = d.totalAmount - d.paidAmount;
  return rem > 0 ? rem : Math.max(0, d.amount);
}

export interface InsightsDateRange {
  startMillis: number;
  endMillis: number;
  label: string;
}

export function resolvePeriodRange(
  period: InsightsPeriod,
  customStart?: number | null,
  customEnd?: number | null,
  isBn = false
): InsightsDateRange {
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

  if (period === 'CUSTOM' && customStart != null && customEnd != null) {
    const start = Math.min(customStart, customEnd);
    const endD = new Date(Math.max(customStart, customEnd));
    const end = new Date(endD.getFullYear(), endD.getMonth(), endD.getDate(), 23, 59, 59, 999).getTime();
    return {
      startMillis: start,
      endMillis: end,
      label: isBn ? 'কাস্টম সময়' : 'Custom Range',
    };
  }

  if (period === 'LAST_MONTH') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0).getTime();
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();
    return { startMillis: start, endMillis: end, label: isBn ? 'গত মাস' : 'Last Month' };
  }

  if (period === 'LAST_3_MONTHS') {
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0).getTime();
    return { startMillis: start, endMillis: endOfToday, label: isBn ? 'গত ৩ মাস' : 'Last 3 Months' };
  }

  if (period === 'THIS_YEAR') {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
    return { startMillis: start, endMillis: endOfToday, label: isBn ? 'এই বছর' : 'This Year' };
  }

  // THIS_MONTH default
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
  return { startMillis: start, endMillis: endOfToday, label: isBn ? 'এই মাস' : 'This Month' };
}

export interface CategoryBreakdownItem {
  categoryName: string;
  categoryNameBn: string;
  amount: number;
  percentage: number;
  count: number;
  colorHex: string;
  iconName: string;
  subcategories: Array<{
    name: string;
    amount: number;
    percentageOfCategory: number;
    count: number;
  }>;
}

export function buildCategoryBreakdown(
  transactions: TransactionEntity[],
  categories: CategoryEntity[],
  mode: 'EXPENSE' | 'INCOME' = 'EXPENSE'
): CategoryBreakdownItem[] {
  const filtered = transactions.filter((t) =>
    mode === 'INCOME' ? isEligibleIncome(t) : isEligibleExpense(t)
  );
  const total = filtered.reduce((acc, t) => acc + t.amount, 0);
  const map = new Map<string, TransactionEntity[]>();

  for (const tx of filtered) {
    const key = tx.category || (mode === 'INCOME' ? 'Other Income' : 'Other Expenses');
    const arr = map.get(key) ?? [];
    arr.push(tx);
    map.set(key, arr);
  }

  const fallbackColors = [
    '#0284C7', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6',
    '#EF4444', '#14B8A6', '#F97316', '#6366F1', '#64748B',
  ];

  const items: CategoryBreakdownItem[] = [];
  let idx = 0;
  for (const [catName, list] of map.entries()) {
    const catMeta = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
    const amount = list.reduce((a, t) => a + t.amount, 0);

    const subMap = new Map<string, { amount: number; count: number }>();
    for (const tx of list) {
      const sub = tx.subcategory?.trim() || 'General';
      const cur = subMap.get(sub) ?? { amount: 0, count: 0 };
      cur.amount += tx.amount;
      cur.count += 1;
      subMap.set(sub, cur);
    }
    const subcategories = Array.from(subMap.entries())
      .map(([name, info]) => ({
        name,
        amount: info.amount,
        count: info.count,
        percentageOfCategory: amount > 0 ? (info.amount / amount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    items.push({
      categoryName: catName,
      categoryNameBn: catMeta?.nameBn || catName,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
      count: list.length,
      colorHex: catMeta?.colorHex || fallbackColors[idx % fallbackColors.length],
      iconName: catMeta?.iconName || 'category',
      subcategories,
    });
    idx++;
  }

  return items.sort((a, b) => b.amount - a.amount);
}

export interface TrendPoint {
  label: string;
  amount: number;
  startMillis: number;
  endMillis: number;
}

export function buildSpendingTrend(
  transactions: TransactionEntity[],
  range: InsightsDateRange,
  isIncome = false,
  isBn = false
): {
  points: TrendPoint[];
  totalAmount: number;
  highestLabel: string;
  highestAmount: number;
  dailyAverage: number;
} {
  const eligible = transactions.filter(
    (t) =>
      t.timestamp >= range.startMillis &&
      t.timestamp <= range.endMillis &&
      (isIncome ? isEligibleIncome(t) : isEligibleExpense(t))
  );

  const daySpan = Math.max(1, Math.ceil((range.endMillis - range.startMillis) / 86_400_000));
  const bucketByMonth = daySpan > 45;
  const points: TrendPoint[] = [];

  if (bucketByMonth) {
    const startD = new Date(range.startMillis);
    const endD = new Date(range.endMillis);
    let y = startD.getFullYear();
    let m = startD.getMonth();
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const bnShortMonths = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];

    while (y < endD.getFullYear() || (y === endD.getFullYear() && m <= endD.getMonth())) {
      const bStart = new Date(y, m, 1, 0, 0, 0, 0).getTime();
      const bEnd = new Date(y, m + 1, 0, 23, 59, 59, 999).getTime();
      const sum = eligible
        .filter((t) => t.timestamp >= bStart && t.timestamp <= bEnd)
        .reduce((acc, t) => acc + t.amount, 0);
      points.push({
        label: isBn ? bnShortMonths[m] : shortMonths[m],
        amount: sum,
        startMillis: bStart,
        endMillis: bEnd,
      });
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }
  } else {
    const totalDays = Math.min(35, daySpan);
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(range.startMillis + i * 86_400_000);
      const bStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
      const bEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
      const sum = eligible
        .filter((t) => t.timestamp >= bStart && t.timestamp <= bEnd)
        .reduce((acc, t) => acc + t.amount, 0);
      points.push({
        label: String(d.getDate()),
        amount: sum,
        startMillis: bStart,
        endMillis: bEnd,
      });
    }
  }

  const totalAmount = eligible.reduce((acc, t) => acc + t.amount, 0);
  let highestLabel = '-';
  let highestAmount = 0;
  for (const p of points) {
    if (p.amount > highestAmount) {
      highestAmount = p.amount;
      highestLabel = p.label;
    }
  }

  return {
    points,
    totalAmount,
    highestLabel,
    highestAmount,
    dailyAverage: totalAmount / daySpan,
  };
}

export function getLast90DayDailyFlow(
  transactions: TransactionEntity[],
  accountId: string
): Array<{ dayLabel: string; income: number; expense: number }> {
  const now = new Date();
  const buckets: Array<{ dayLabel: string; income: number; expense: number }> = [];
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  // Group 90 days into 18 5-day bars for crisp visual clarity
  for (let i = 17; i >= 0; i--) {
    const bStart = startOfToday - (i * 5 + 4) * 86_400_000;
    const bEnd = startOfToday - (i * 5 - 1) * 86_400_000 - 1;
    let inc = 0;
    let exp = 0;
    for (const tx of transactions) {
      if (tx.timestamp < bStart || tx.timestamp > bEnd) continue;
      if (tx.accountId !== accountId && tx.toAccountId !== accountId) continue;
      if (tx.type === 'INCOME' || tx.type === 'BORROW') inc += tx.amount;
      else if (tx.type === 'EXPENSE' || tx.type === 'LEND') exp += tx.amount;
      else if (tx.type === 'TRANSFER' || tx.type === 'CC_PAYMENT') {
        if (tx.toAccountId === accountId) inc += tx.amount;
        if (tx.accountId === accountId) exp += tx.amount;
      }
    }
    const d = new Date(bStart);
    buckets.push({
      dayLabel: `${d.getDate()}/${d.getMonth() + 1}`,
      income: inc,
      expense: exp,
    });
  }
  return buckets;
}

export function computeSpendingByDayOfWeek(transactions: TransactionEntity[], isBn = false) {
  const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daysBn = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
  const totals = new Array(7).fill(0);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  for (const tx of transactions) {
    if (tx.timestamp >= monthStart && isEligibleExpense(tx)) {
      const dow = new Date(tx.timestamp).getDay();
      totals[dow] += tx.amount;
    }
  }
  return totals.map((amount, idx) => ({
    label: isBn ? daysBn[idx] : daysEn[idx],
    amount,
  }));
}

export function computeSpendingStreakDays(transactions: TransactionEntity[]): number {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const daysWithTx = new Set<number>();
  for (const tx of transactions) {
    const d = new Date(tx.timestamp);
    daysWithTx.add(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
  }
  let streak = 0;
  let cursor = todayStart;
  while (daysWithTx.has(cursor)) {
    streak++;
    cursor -= 86_400_000;
  }
  return streak;
}
