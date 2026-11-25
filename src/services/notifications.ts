import type {
  AccountEntity,
  AppLanguage,
  BudgetEntity,
  DebtEntity,
  ExtendedSettingsState,
  SmartNotification,
  TransactionEntity,
} from '../types/models';
import { getDebtRemaining, isEligibleExpense } from '../utils/analytics';
import { formatCurrency, getMonthKey } from '../utils/formatters';

const READ_NOTIFS_KEY = 'hp_read_notification_ids_v1';

export function loadReadNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_NOTIFS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function saveReadNotificationIds(ids: Set<string>): void {
  try {
    localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

export function generateSmartNotifications(params: {
  accounts: AccountEntity[];
  transactions: TransactionEntity[];
  budgets: BudgetEntity[];
  debts: DebtEntity[];
  currencySymbol: string;
  language: AppLanguage;
  extendedSettings: ExtendedSettingsState;
  readIds: Set<string>;
}): SmartNotification[] {
  const {
    accounts,
    transactions,
    budgets,
    debts,
    currencySymbol,
    language,
    extendedSettings,
    readIds,
  } = params;
  const isBn = language === 'BANGLA';
  const now = new Date();
  const todayDay = now.getDate();
  const monthKey = getMonthKey(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const notifications: SmartNotification[] = [];

  // 1. Credit Card payment due reminders
  if (extendedSettings.creditCardDueEnabled) {
    for (const acc of accounts) {
      if (acc.type !== 'CREDIT_CARD' || acc.isHidden) continue;
      const dueDay = parseInt(acc.paymentDueDate, 10);
      const owed = acc.balance < 0 ? Math.abs(acc.balance) : 0;
      if (!Number.isNaN(dueDay) && dueDay >= 1 && dueDay <= 31 && owed > 0) {
        let daysUntil = dueDay - todayDay;
        if (daysUntil < 0) daysUntil += 30;
        if (daysUntil <= 5) {
          const id = `cc_due_${acc.id}_${monthKey}`;
          notifications.push({
            id,
            type: 'BILL_DUE',
            title: isBn ? `${acc.name} বিল পরিশোধের তারিখ নিকটবর্তী` : `${acc.name} Payment Due Soon`,
            message: isBn
              ? `বকেয়া ${formatCurrency(owed, currencySymbol, language)} • ${daysUntil === 0 ? 'আজ শেষ দিন' : `${daysUntil} দিন বাকি`}`
              : `Outstanding ${formatCurrency(owed, currencySymbol, language)} • ${daysUntil === 0 ? 'Due today' : `Due in ${daysUntil} days`}`,
            timestamp: now.getTime() - 1000 * 60 * 15,
            isRead: readIds.has(id),
            relatedId: acc.id,
          });
        }
      }
    }
  }

  // 2. Budget alerts
  if (extendedSettings.budgetAlertEnabled) {
    const monthExpenses = transactions.filter(
      (t) => t.timestamp >= monthStart && isEligibleExpense(t)
    );
    const activeBudgets = budgets.filter((b) => !b.monthYear || b.monthYear === monthKey);
    for (const b of activeBudgets) {
      const spent = b.isOverall
        ? monthExpenses.reduce((acc, t) => acc + t.amount, 0)
        : monthExpenses
            .filter(
              (t) =>
                t.category.toLowerCase() === b.categoryName.toLowerCase() &&
                (!b.subcategoryName ||
                  t.subcategory.toLowerCase() === b.subcategoryName.toLowerCase())
            )
            .reduce((acc, t) => acc + t.amount, 0);

      if (b.monthlyLimit > 0) {
        const pct = (spent / b.monthlyLimit) * 100;
        const threshold = b.alertPercentage || 80;
        if (pct >= threshold) {
          const id = `budget_alert_${b.id}_${monthKey}_${pct >= 100 ? 'over' : 'warn'}`;
          const label = b.isOverall ? (isBn ? 'সামগ্রিক বাজেট' : 'Overall Budget') : b.categoryName;
          notifications.push({
            id,
            type: 'BUDGET_ALERT',
            title:
              pct >= 100
                ? isBn
                  ? `${label} বাজেট অতিক্রম করেছে`
                  : `${label} Exceeded Budget`
                : isBn
                ? `${label} বাজেট সতর্কতা (${Math.round(pct)}%)`
                : `${label} Budget Alert (${Math.round(pct)}%)`,
            message: isBn
              ? `খরচ হয়েছে ${formatCurrency(spent, currencySymbol, language)} / ${formatCurrency(b.monthlyLimit, currencySymbol, language)}`
              : `Spent ${formatCurrency(spent, currencySymbol, language)} of ${formatCurrency(b.monthlyLimit, currencySymbol, language)}`,
            timestamp: now.getTime() - 1000 * 60 * 45,
            isRead: readIds.has(id),
            relatedId: b.id,
          });
        }
      }
    }
  }

  // 3. Debt due reminders
  if (extendedSettings.debtAlertEnabled) {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    for (const d of debts) {
      if (d.isSettled) continue;
      const rem = getDebtRemaining(d);
      if (rem <= 0 || !d.dueDate) continue;
      const dueTs = Date.parse(d.dueDate);
      if (Number.isNaN(dueTs)) continue;
      const daysDiff = Math.ceil((dueTs - todayStart) / 86_400_000);
      if (daysDiff <= 7) {
        const id = `debt_due_${d.id}_${d.dueDate}`;
        notifications.push({
          id,
          type: 'DEBT_DUE',
          title:
            d.type === 'BORROWED'
              ? isBn
                ? `${d.personName}-কে ঋণ পরিশোধের তারিখ`
                : `Debt Repayment Due: ${d.personName}`
              : isBn
              ? `${d.personName} থেকে টাকা আদায়ের তারিখ`
              : `Loan Collection Due: ${d.personName}`,
          message: isBn
            ? `বাকি ${formatCurrency(rem, currencySymbol, language)} • ${daysDiff < 0 ? 'সময় পেরিয়ে গেছে' : daysDiff === 0 ? 'আজ তারিখ' : `${daysDiff} দিন বাকি`}`
            : `Remaining ${formatCurrency(rem, currencySymbol, language)} • ${daysDiff < 0 ? 'Overdue' : daysDiff === 0 ? 'Due today' : `In ${daysDiff} days`}`,
          timestamp: now.getTime() - 1000 * 60 * 90,
          isRead: readIds.has(id),
          relatedId: d.id,
        });
      }
    }
  }

  // 4. Recurring bill insight
  if (extendedSettings.billReminderEnabled) {
    const recurringCount = transactions.filter((t) => t.isRecurring).length;
    if (recurringCount > 0) {
      const id = `recurring_summary_${monthKey}`;
      notifications.push({
        id,
        type: 'INSIGHT',
        title: isBn ? 'পুনরাবৃত্ত লেনদেন সক্রিয়' : 'Recurring Bills Active',
        message: isBn
          ? `আপনার ${recurringCount}টি নিয়মিত বিল ও পুনরাবৃত্ত লেনদেন ট্র্যাক করা হচ্ছে।`
          : `${recurringCount} recurring transactions & bills are being tracked.`,
        timestamp: now.getTime() - 1000 * 60 * 180,
        isRead: readIds.has(id),
      });
    }
  }

  return notifications.sort((a, b) => b.timestamp - a.timestamp);
}
