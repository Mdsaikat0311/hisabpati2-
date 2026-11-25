import type {
  AccountEntity,
  AccountType,
  AppSettingsEntity,
  BudgetEntity,
  CategoryEntity,
  DebtEntity,
  DebtType,
  SavingsGoalEntity,
  SubcategoryEntity,
  TransactionEntity,
  TransactionType,
} from '../types/models';
import { getDefaultCategories } from '../data/initialData';
import { computeSingleTxBalanceDelta } from './analytics';
import { getMonthKey } from './formatters';

export type BackupFormatType =
  | 'MY_WALLET_CURRENT'
  | 'MY_WALLET_LEGACY'
  | 'MY_WALLET_CONVERTED_EXPEND'
  | 'EXPEND_LEGACY'
  | 'CSV_EXPORT';

export type RestoreStage =
  | 'READING_FILE'
  | 'VALIDATING_STRUCTURE'
  | 'DETECTING_SCHEMA'
  | 'MIGRATING_LEGACY'
  | 'VALIDATING_REFERENCES'
  | 'CREATING_SNAPSHOT'
  | 'RESTORING_DATABASE'
  | 'RECONCILING_BALANCES'
  | 'COMPLETED';

export interface NormalizedBackupPayload {
  appName: string;
  schemaVersion: number;
  formatType: BackupFormatType;
  backupDate: string;
  settings: Partial<AppSettingsEntity> | null;
  accounts: AccountEntity[];
  accountsHaveExplicitBalance: Set<string>;
  categories: CategoryEntity[];
  subcategories: SubcategoryEntity[];
  transactions: TransactionEntity[];
  budgets: BudgetEntity[];
  debts: DebtEntity[];
  savingsGoals: SavingsGoalEntity[];
  skippedDuplicatesCount: number;
  migratedRecordsCount: number;
}

export function createBackupJson(data: {
  settings: AppSettingsEntity;
  accounts: AccountEntity[];
  categories: CategoryEntity[];
  subcategories: SubcategoryEntity[];
  transactions: TransactionEntity[];
  budgets: BudgetEntity[];
  debts: DebtEntity[];
  savingsGoals: SavingsGoalEntity[];
}): string {
  const payload = {
    appName: 'Hishab Pati',
    schemaVersion: 1,
    backupDate: new Date().toISOString(),
    currency: data.settings.currencyCode || 'BDT',
    settings: {
      userName: data.settings.userName,
      country: data.settings.country,
      currencyCode: data.settings.currencyCode,
      currencySymbol: data.settings.currencySymbol,
      language: data.settings.language,
      themeMode: data.settings.themeMode,
      themeColor: data.settings.themeColor,
      backgroundTexture: data.settings.backgroundTexture,
      appLockEnabled: data.settings.appLockEnabled,
      screenshotProtectionEnabled: data.settings.screenshotProtectionEnabled,
      notificationsEnabled: data.settings.notificationsEnabled,
    },
    accounts: data.accounts,
    categories: data.categories,
    subcategories: data.subcategories,
    transactions: data.transactions,
    budgets: data.budgets,
    debts: data.debts,
    savingsGoals: data.savingsGoals,
  };
  return JSON.stringify(payload, null, 2);
}

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function exportToCsv(data: {
  accounts: AccountEntity[];
  transactions: TransactionEntity[];
  debts: DebtEntity[];
  currencyCode?: string;
}): string {
  const accMap = new Map(data.accounts.map((a) => [a.id, a]));
  const currency = data.currencyCode || 'BDT';
  const lines: string[] = [];
  lines.push('# Hishab Pati Export');
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push(`# Currency: ${currency}`);
  lines.push('');
  lines.push('SECTION,TRANSACTIONS');
  lines.push(
    'ID,Date,Timestamp,Type,Amount,Currency,AccountID,AccountName,ToAccountID,ToAccountName,Category,Subcategory,Title,PayeeOrPayer,Notes,IsRecurring'
  );

  for (const tx of data.transactions) {
    const d = new Date(tx.timestamp);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes()
    ).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    const accName = accMap.get(tx.accountId)?.name ?? tx.accountId;
    const toAccName = tx.toAccountId ? accMap.get(tx.toAccountId)?.name ?? tx.toAccountId : '';
    lines.push(
      [
        escapeCsv(tx.id),
        escapeCsv(dateStr),
        String(tx.timestamp),
        escapeCsv(tx.type),
        tx.amount.toFixed(2),
        escapeCsv(currency),
        escapeCsv(tx.accountId),
        escapeCsv(accName),
        escapeCsv(tx.toAccountId ?? ''),
        escapeCsv(toAccName),
        escapeCsv(tx.category),
        escapeCsv(tx.subcategory),
        escapeCsv(tx.title),
        escapeCsv(tx.payeeOrPayer),
        escapeCsv(tx.notes),
        String(tx.isRecurring),
      ].join(',')
    );
  }

  lines.push('');
  lines.push('SECTION,ACCOUNTS');
  lines.push('ID,Name,Type,Institution,Balance,OpeningBalance,AccountNumberLast4,Notes');
  for (const acc of data.accounts) {
    lines.push(
      [
        escapeCsv(acc.id),
        escapeCsv(acc.name),
        escapeCsv(acc.type),
        escapeCsv(acc.institution),
        acc.balance.toFixed(2),
        acc.openingBalance.toFixed(2),
        escapeCsv(acc.accountNumberLast4),
        escapeCsv(acc.notes),
      ].join(',')
    );
  }

  lines.push('');
  lines.push('SECTION,DEBTS');
  lines.push('ID,PersonName,Type,Amount,TotalAmount,PaidAmount,DueDate,Notes,IsSettled,AccountID');
  for (const d of data.debts) {
    lines.push(
      [
        escapeCsv(d.id),
        escapeCsv(d.personName),
        escapeCsv(d.type),
        d.amount.toFixed(2),
        d.totalAmount.toFixed(2),
        d.paidAmount.toFixed(2),
        escapeCsv(d.dueDate),
        escapeCsv(d.notes),
        String(d.isSettled),
        escapeCsv(d.accountId ?? ''),
      ].join(',')
    );
  }

  return lines.join('\n');
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') {
      if (inQuotes && i + 1 < csv.length && csv[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (c === '\r' && i + 1 < csv.length && csv[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  }
  return rows;
}

export function parseCsvBackup(csvText: string): NormalizedBackupPayload {
  const trimmed = csvText.trim();
  if (!trimmed) throw new Error('The CSV file is empty.');
  const rows = parseCsvRows(trimmed);
  if (rows.length === 0) throw new Error('No readable rows found in CSV.');

  const parsedTxs: TransactionEntity[] = [];
  const parsedAccs: AccountEntity[] = [];
  const parsedDebts: DebtEntity[] = [];
  const detectedCats = new Map<string, boolean>();

  let section = 'TRANSACTIONS';
  let txHeaders: Record<string, number> | null = null;
  let accHeaders: Record<string, number> | null = null;
  let debtHeaders: Record<string, number> | null = null;

  const cell = (r: string[], h: Record<string, number>, k: string) => {
    const idx = h[k];
    return idx !== undefined && idx < r.length ? r[idx].trim() : '';
  };

  for (const row of rows) {
    const first = (row[0] || '').trim();
    if (first.startsWith('#')) continue;
    if (first.toUpperCase() === 'SECTION' && row.length > 1) {
      section = row[1].trim().toUpperCase();
      continue;
    }
    const lower = row.map((c) => c.trim().toLowerCase());
    if (lower.includes('personname') || (section === 'DEBTS' && !debtHeaders)) {
      debtHeaders = Object.fromEntries(lower.map((name, i) => [name, i]));
      section = 'DEBTS';
      continue;
    }
    if ((lower.includes('name') && (lower.includes('balance') || lower.includes('institution'))) || (section === 'ACCOUNTS' && !accHeaders)) {
      accHeaders = Object.fromEntries(lower.map((name, i) => [name, i]));
      section = 'ACCOUNTS';
      continue;
    }
    if ((lower.includes('amount') && (lower.includes('category') || lower.includes('date') || lower.includes('title'))) || (section === 'TRANSACTIONS' && !txHeaders)) {
      txHeaders = Object.fromEntries(lower.map((name, i) => [name, i]));
      section = 'TRANSACTIONS';
      continue;
    }

    if (section === 'TRANSACTIONS' && txHeaders) {
      const amount = parseFloat(cell(row, txHeaders, 'amount')) || 0;
      if (amount <= 0) continue;
      const typeRaw = cell(row, txHeaders, 'type').toUpperCase();
      const type: TransactionType = (['EXPENSE', 'INCOME', 'TRANSFER', 'LEND', 'BORROW', 'CC_PAYMENT'] as const).includes(
        typeRaw as TransactionType
      )
        ? (typeRaw as TransactionType)
        : typeRaw.includes('INCOME')
        ? 'INCOME'
        : typeRaw.includes('TRANSFER')
        ? 'TRANSFER'
        : 'EXPENSE';
      const tsNum = Number(cell(row, txHeaders, 'timestamp'));
      const dateStr = cell(row, txHeaders, 'date');
      const timestamp = Number.isFinite(tsNum) && tsNum > 0 ? tsNum : Date.parse(dateStr) || Date.now();
      const accId =
        cell(row, txHeaders, 'accountid') ||
        `acc_${(cell(row, txHeaders, 'accountname') || 'cash_wallet').toLowerCase().replace(/\s+/g, '_')}`;
      const toAccId =
        cell(row, txHeaders, 'toaccountid') ||
        (cell(row, txHeaders, 'toaccountname')
          ? `acc_${cell(row, txHeaders, 'toaccountname').toLowerCase().replace(/\s+/g, '_')}`
          : null);
      const category = cell(row, txHeaders, 'category') || (type === 'INCOME' ? 'Other Income' : 'Other Expenses');
      parsedTxs.push({
        id: cell(row, txHeaders, 'id') || `csv_tx_${crypto.randomUUID().slice(0, 8)}`,
        type,
        amount,
        title: cell(row, txHeaders, 'title') || category,
        category,
        subcategory: cell(row, txHeaders, 'subcategory'),
        accountId: accId,
        toAccountId: toAccId,
        timestamp,
        notes: cell(row, txHeaders, 'notes'),
        isRecurring: cell(row, txHeaders, 'isrecurring').toLowerCase() === 'true',
        payeeOrPayer: cell(row, txHeaders, 'payeeorpayer'),
        debtId: null,
      });
      detectedCats.set(category, type === 'INCOME');
    } else if (section === 'ACCOUNTS' && accHeaders) {
      const typeRaw = cell(row, accHeaders, 'type').toUpperCase();
      const validTypes: AccountType[] = ['BANK', 'CREDIT_CARD', 'CASH', 'MFS', 'OTHER'];
      const type: AccountType = validTypes.includes(typeRaw as AccountType) ? (typeRaw as AccountType) : 'CASH';
      const bal = parseFloat(cell(row, accHeaders, 'balance')) || 0;
      const open = parseFloat(cell(row, accHeaders, 'openingbalance'));
      parsedAccs.push({
        id: cell(row, accHeaders, 'id') || `acc_${crypto.randomUUID().slice(0, 8)}`,
        name: cell(row, accHeaders, 'name') || 'Account',
        type,
        institution: cell(row, accHeaders, 'institution'),
        balance: bal,
        openingBalance: Number.isFinite(open) ? open : bal,
        accountNumberLast4: cell(row, accHeaders, 'accountnumberlast4'),
        colorHex: '#0284C7',
        iconName: 'account_balance',
        isHidden: false,
        sortOrder: parsedAccs.length,
        creditLimit: 0,
        billingDate: '',
        paymentDueDate: '',
        minPayment: 0,
        notes: cell(row, accHeaders, 'notes'),
        includeInTotal: true,
      });
    } else if (section === 'DEBTS' && debtHeaders) {
      const typeRaw = cell(row, debtHeaders, 'type').toUpperCase();
      const type: DebtType = typeRaw === 'LENT' ? 'LENT' : 'BORROWED';
      const amount = parseFloat(cell(row, debtHeaders, 'amount')) || 0;
      const totalAmount = parseFloat(cell(row, debtHeaders, 'totalamount')) || amount;
      const paidAmount = parseFloat(cell(row, debtHeaders, 'paidamount')) || 0;
      parsedDebts.push({
        id: cell(row, debtHeaders, 'id') || `debt_${crypto.randomUUID().slice(0, 8)}`,
        personName: cell(row, debtHeaders, 'personname') || 'Contact',
        amount,
        totalAmount,
        paidAmount,
        type,
        dueDate: cell(row, debtHeaders, 'duedate'),
        notes: cell(row, debtHeaders, 'notes'),
        isSettled: cell(row, debtHeaders, 'issettled').toLowerCase() === 'true',
        accountId: cell(row, debtHeaders, 'accountid') || null,
        reason: '',
        colorHex: type === 'LENT' ? '#3B82F6' : '#EF4444',
        tentativeCloseDateStr: cell(row, debtHeaders, 'duedate'),
        tags: '',
      });
    }
  }

  const accIds = new Set(parsedAccs.map((a) => a.id));
  for (const tx of parsedTxs) {
    if (!accIds.has(tx.accountId)) {
      accIds.add(tx.accountId);
      parsedAccs.push({
        id: tx.accountId,
        name: tx.accountId.replace(/^acc_/, '').replace(/_/g, ' '),
        type: 'CASH',
        institution: '',
        balance: 0,
        openingBalance: 0,
        accountNumberLast4: '',
        colorHex: '#10B981',
        iconName: 'payments',
        isHidden: false,
        sortOrder: parsedAccs.length,
        creditLimit: 0,
        billingDate: '',
        paymentDueDate: '',
        minPayment: 0,
        notes: '',
        includeInTotal: true,
      });
    }
  }

  if (parsedAccs.length === 0 && parsedTxs.length === 0 && parsedDebts.length === 0) {
    throw new Error('No valid accounts, transactions, or debts found in CSV.');
  }

  const defaults = getDefaultCategories();
  const categories = [...defaults.categories];
  for (const [catName, isInc] of detectedCats.entries()) {
    if (!categories.some((c) => c.name.toLowerCase() === catName.toLowerCase())) {
      categories.push({
        id: `cat_${catName.toLowerCase().replace(/\s+/g, '_')}`,
        name: catName,
        nameBn: catName,
        isIncome: isInc,
        isTransfer: false,
        isActive: true,
        iconName: 'category',
        colorHex: isInc ? '#10B981' : '#EF4444',
        sortOrder: categories.length,
      });
    }
  }

  return {
    appName: 'Hishab Pati',
    schemaVersion: 1,
    formatType: 'CSV_EXPORT',
    backupDate: new Date().toISOString(),
    settings: null,
    accounts: parsedAccs,
    accountsHaveExplicitBalance: new Set(parsedAccs.map((a) => a.id)),
    categories,
    subcategories: defaults.subcategories,
    transactions: parsedTxs,
    budgets: [],
    debts: parsedDebts,
    savingsGoals: [],
    skippedDuplicatesCount: 0,
    migratedRecordsCount: 0,
  };
}

function mapLegacyAccountType(raw: unknown): AccountType {
  const s = String(raw || '').toUpperCase();
  if (s === 'CREDIT_CARD' || s.includes('CREDIT')) return 'CREDIT_CARD';
  if (s === 'BANK' || s === 'DEBIT_CARD' || s.includes('BANK') || s.includes('SAVINGS') || s.includes('CHECKING')) return 'BANK';
  if (s === 'MFS' || s.includes('MOBILE') || s.includes('BKASH') || s.includes('NAGAD') || s.includes('WALLET')) return 'MFS';
  if (s === 'CASH') return 'CASH';
  return 'OTHER';
}

function mapLegacyTxType(raw: unknown): TransactionType {
  const s = String(raw || '').toUpperCase();
  if (s === 'INCOME' || s === 'CREDIT') return 'INCOME';
  if (s === 'TRANSFER') return 'TRANSFER';
  if (s === 'LEND') return 'LEND';
  if (s === 'BORROW') return 'BORROW';
  if (s === 'CC_PAYMENT') return 'CC_PAYMENT';
  return 'EXPENSE';
}

export function parseAndMigrateBackup(rawInput: string): NormalizedBackupPayload {
  const trimmed = rawInput.trim();
  if (!trimmed) throw new Error('Backup file is empty.');
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return parseCsvBackup(trimmed);
  }

  const root = JSON.parse(trimmed) as Record<string, unknown>;
  const rawAppName = String(root.appName ?? root.sourceApp ?? '').trim();
  const isExpend =
    rawAppName.toLowerCase().includes('expend') ||
    Array.isArray(root.wallets) ||
    Array.isArray(root.expenses) ||
    Array.isArray(root.records) ||
    Array.isArray(root.loans);

  const rawAccounts = (
    (root.accounts as unknown[]) ??
    (root.wallets as unknown[]) ??
    (root.accountList as unknown[]) ??
    (root.walletList as unknown[]) ??
    []
  ) as Array<Record<string, unknown>>;

  const rawArchived = ((root.archivedWallets as unknown[]) ?? []) as Array<Record<string, unknown>>;
  const allRawAccs = [...rawAccounts, ...rawArchived];

  const explicitBalanceIds = new Set<string>();
  const accounts: AccountEntity[] = allRawAccs.map((a, idx) => {
    const id = String(a.id ?? a.walletId ?? `acc_${idx}_${Date.now()}`);
    if (a.balance !== undefined || a.currentBalance !== undefined) {
      explicitBalanceIds.add(id);
    }
    const bal = Number(a.balance ?? a.currentBalance ?? a.openingBalance ?? 0);
    const open = Number(a.openingBalance ?? a.initialBalance ?? bal);
    return {
      id,
      name: String(a.name ?? a.title ?? a.walletName ?? 'Wallet'),
      type: mapLegacyAccountType(a.type ?? a.accountType ?? a.walletType),
      institution: String(a.institution ?? a.bankName ?? a.provider ?? ''),
      balance: Number.isFinite(bal) ? bal : 0,
      openingBalance: Number.isFinite(open) ? open : 0,
      accountNumberLast4: String(a.accountNumberLast4 ?? a.last4 ?? ''),
      colorHex: String(a.colorHex ?? a.color ?? '#0284C7'),
      iconName: String(a.iconName ?? a.icon ?? 'account_balance'),
      isHidden: Boolean(a.isHidden ?? a.archived ?? false),
      sortOrder: Number(a.sortOrder ?? idx),
      creditLimit: Number(a.creditLimit ?? 0),
      billingDate: String(a.billingDate ?? ''),
      paymentDueDate: String(a.paymentDueDate ?? ''),
      minPayment: Number(a.minPayment ?? 0),
      notes: String(a.notes ?? ''),
      includeInTotal: a.includeInTotal === undefined ? true : Boolean(a.includeInTotal),
    };
  });

  const rawTxs = (
    (root.transactions as unknown[]) ??
    (root.expenses as unknown[]) ??
    (root.records as unknown[]) ??
    (root.transactionList as unknown[]) ??
    []
  ) as Array<Record<string, unknown>>;

  const seenTxIds = new Set<string>();
  let skippedDuplicatesCount = 0;
  const transactions: TransactionEntity[] = [];

  for (let i = 0; i < rawTxs.length; i++) {
    const t = rawTxs[i];
    const id = String(t.id ?? `tx_mig_${i}_${Date.now()}`);
    if (seenTxIds.has(id)) {
      skippedDuplicatesCount++;
      continue;
    }
    seenTxIds.add(id);
    const amount = Math.abs(Number(t.amount ?? t.value ?? 0));
    const tsRaw = t.timestamp ?? t.dateMillis ?? t.createdAt;
    const timestamp =
      typeof tsRaw === 'number'
        ? tsRaw
        : typeof tsRaw === 'string' && /^\d+$/.test(tsRaw)
        ? Number(tsRaw)
        : typeof t.date === 'string'
        ? Date.parse(t.date) || Date.now()
        : Date.now();
    const accId = String(
      t.accountId ?? t.walletId ?? t.sourceWalletId ?? accounts[0]?.id ?? 'acc_default_cash'
    );
    const toAcc = t.toAccountId ?? t.toWalletId ?? t.destinationWalletId ?? null;
    transactions.push({
      id,
      type: mapLegacyTxType(t.type ?? t.transactionType),
      amount: Number.isFinite(amount) ? amount : 0,
      title: String(t.title ?? t.description ?? t.name ?? t.category ?? 'Transaction'),
      category: String(t.category ?? t.categoryName ?? 'Other Expenses'),
      subcategory: String(t.subcategory ?? t.subcategoryName ?? ''),
      accountId: accId,
      toAccountId: toAcc ? String(toAcc) : null,
      timestamp,
      notes: String(t.notes ?? t.note ?? ''),
      isRecurring: Boolean(t.isRecurring ?? false),
      payeeOrPayer: String(t.payeeOrPayer ?? t.merchant ?? ''),
      debtId: t.debtId ? String(t.debtId) : null,
    });
  }

  const defaults = getDefaultCategories();
  const rawCats = ((root.categories as unknown[]) ?? []) as Array<Record<string, unknown>>;
  const categories: CategoryEntity[] =
    rawCats.length > 0
      ? rawCats.map((c, idx) => ({
          id: String(c.id ?? `cat_${idx}`),
          name: String(c.name ?? 'Category'),
          nameBn: String(c.nameBn ?? c.name ?? 'ক্যাটাগরি'),
          isIncome: Boolean(c.isIncome ?? false),
          isTransfer: Boolean(c.isTransfer ?? false),
          isActive: c.isActive === undefined ? true : Boolean(c.isActive),
          iconName: String(c.iconName ?? 'category'),
          colorHex: String(c.colorHex ?? '#0284C7'),
          sortOrder: Number(c.sortOrder ?? idx),
        }))
      : defaults.categories;

  const rawSubs = ((root.subcategories as unknown[]) ?? []) as Array<Record<string, unknown>>;
  const subcategories: SubcategoryEntity[] =
    rawSubs.length > 0
      ? rawSubs.map((s, idx) => ({
          id: String(s.id ?? `sub_${idx}`),
          categoryId: String(s.categoryId ?? ''),
          name: String(s.name ?? ''),
          nameBn: String(s.nameBn ?? s.name ?? ''),
          sortOrder: Number(s.sortOrder ?? idx),
        }))
      : defaults.subcategories;

  const rawBudgets = ((root.budgets as unknown[]) ?? []) as Array<Record<string, unknown>>;
  const budgets: BudgetEntity[] = rawBudgets.map((b, idx) => ({
    id: String(b.id ?? `bgt_${idx}`),
    categoryName: String(b.categoryName ?? ''),
    monthlyLimit: Number(b.monthlyLimit ?? b.limit ?? 0),
    monthYear: String(b.monthYear ?? getMonthKey()),
    isOverall: Boolean(b.isOverall ?? false),
    rolloverEnabled: Boolean(b.rolloverEnabled ?? false),
    name: String(b.name ?? b.categoryName ?? 'Budget'),
    subcategoryName: String(b.subcategoryName ?? ''),
    iconName: String(b.iconName ?? 'pie_chart'),
    colorHex: String(b.colorHex ?? '#0284C7'),
    alertPercentage: Number(b.alertPercentage ?? 80),
  }));

  const rawDebts = ((root.debts as unknown[]) ?? (root.loans as unknown[]) ?? []) as Array<
    Record<string, unknown>
  >;
  const debts: DebtEntity[] = rawDebts.map((d, idx) => {
    const dt = String(d.type ?? 'BORROWED').toUpperCase();
    const type: DebtType = dt.includes('LENT') || dt.includes('RECEIVABLE') ? 'LENT' : 'BORROWED';
    return {
      id: String(d.id ?? `debt_${idx}`),
      personName: String(d.personName ?? d.person ?? 'Contact'),
      amount: Number(d.amount ?? d.remainingAmount ?? 0),
      totalAmount: Number(d.totalAmount ?? d.amount ?? 0),
      paidAmount: Number(d.paidAmount ?? 0),
      type,
      dueDate: String(d.dueDate ?? ''),
      notes: String(d.notes ?? ''),
      isSettled: Boolean(d.isSettled ?? false),
      accountId: d.accountId ? String(d.accountId) : null,
      reason: String(d.reason ?? ''),
      colorHex: String(d.colorHex ?? (type === 'LENT' ? '#3B82F6' : '#EF4444')),
      tentativeCloseDateStr: String(d.tentativeCloseDateStr ?? d.dueDate ?? ''),
      tags: String(d.tags ?? ''),
    };
  });

  const rawGoals = ((root.savingsGoals as unknown[]) ?? []) as Array<Record<string, unknown>>;
  const savingsGoals: SavingsGoalEntity[] = rawGoals.map((g, idx) => ({
    id: String(g.id ?? `goal_${idx}`),
    name: String(g.name ?? 'Savings Goal'),
    targetAmount: Number(g.targetAmount ?? 0),
    savedAmount: Number(g.savedAmount ?? 0),
    themeColorHex: String(g.themeColorHex ?? '#06B6D4'),
    iconName: String(g.iconName ?? 'savings'),
    targetDeadline: g.targetDeadline ? Number(g.targetDeadline) : null,
    targetDeadlineStr: String(g.targetDeadlineStr ?? ''),
    createdAt: Number(g.createdAt ?? Date.now()),
    isCompleted: Boolean(g.isCompleted ?? false),
  }));

  return {
    appName: rawAppName || 'Hishab Pati',
    schemaVersion: Number(root.schemaVersion ?? 1),
    formatType: isExpend ? 'EXPEND_LEGACY' : 'MY_WALLET_CURRENT',
    backupDate: String(root.backupDate ?? new Date().toISOString()),
    settings: (root.settings as Partial<AppSettingsEntity>) ?? null,
    accounts,
    accountsHaveExplicitBalance: explicitBalanceIds,
    categories,
    subcategories,
    transactions,
    budgets,
    debts,
    savingsGoals,
    skippedDuplicatesCount,
    migratedRecordsCount: isExpend ? transactions.length + accounts.length : 0,
  };
}

export function generateSampleJsonTemplate(referenceTimeMillis = Date.now()): string {
  const now = new Date(referenceTimeMillis);
  const currentMonthKey = getMonthKey(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const span = Math.max(60_000, referenceTimeMillis - monthStart);
  const tsAt = (step: number, total = 29) =>
    Math.round(monthStart + (span * Math.min(Math.max(step, 0), total)) / total);
  const dateDays = (offset: number) => {
    const d = new Date(referenceTimeMillis + offset * 86_400_000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  };

  const { categories, subcategories } = getDefaultCategories();

  const transactions: TransactionEntity[] = [
    { id: 'tx_sample_inc_salary', type: 'INCOME', amount: 75000, title: 'Monthly Corporate Salary', category: 'Salary', subcategory: 'Monthly Salary', accountId: 'acc_sample_bank', toAccountId: null, timestamp: tsAt(1), notes: 'Sample monthly salary deposit', isRecurring: true, payeeOrPayer: 'Tech Innovations Ltd.', debtId: null },
    { id: 'tx_sample_inc_bonus', type: 'INCOME', amount: 12000, title: 'Quarterly Performance Bonus', category: 'Bonus', subcategory: 'Performance Bonus', accountId: 'acc_sample_bank', toAccountId: null, timestamp: tsAt(2), notes: 'Sample performance bonus credit', isRecurring: false, payeeOrPayer: 'Tech Innovations Ltd.', debtId: null },
    { id: 'tx_sample_inc_business', type: 'INCOME', amount: 15000, title: 'UI Consulting Milestone', category: 'Business', subcategory: 'Consulting', accountId: 'acc_sample_bkash', toAccountId: null, timestamp: tsAt(3), notes: 'Sample freelance consulting fee', isRecurring: false, payeeOrPayer: 'Apex Digital Studio', debtId: null },
    { id: 'tx_sample_inc_gift', type: 'INCOME', amount: 3000, title: 'Family Occasion Cash Gift', category: 'Gifts Received', subcategory: 'Cash Gift', accountId: 'acc_sample_cash', toAccountId: null, timestamp: tsAt(4), notes: 'Sample family gift', isRecurring: false, payeeOrPayer: 'Family', debtId: null },
    { id: 'tx_sample_inc_cashback', type: 'INCOME', amount: 500, title: 'Mobile Payment Cashback', category: 'Other Income', subcategory: 'Refunds & Cashbacks', accountId: 'acc_sample_nagad', toAccountId: null, timestamp: tsAt(5), notes: 'Sample merchant cashback reward', isRecurring: false, payeeOrPayer: 'Nagad Rewards', debtId: null },
    { id: 'tx_sample_trf_atm', type: 'TRANSFER', amount: 8000, title: 'ATM Cash Withdrawal', category: 'Bank Transfer', subcategory: 'ATM Withdrawal', accountId: 'acc_sample_bank', toAccountId: 'acc_sample_cash', timestamp: tsAt(6), notes: 'Sample ATM withdrawal', isRecurring: false, payeeOrPayer: 'City Bank ATM', debtId: null },
    { id: 'tx_sample_trf_bkash', type: 'TRANSFER', amount: 10000, title: 'Add Money to bKash', category: 'Wallet Transfer', subcategory: 'Mobile Financial Service', accountId: 'acc_sample_bank', toAccountId: 'acc_sample_bkash', timestamp: tsAt(7), notes: 'Sample bank-to-bKash transfer', isRecurring: false, payeeOrPayer: 'bKash Add Money', debtId: null },
    { id: 'tx_sample_trf_nagad', type: 'TRANSFER', amount: 3000, title: 'bKash to Nagad Wallet Transfer', category: 'Wallet Transfer', subcategory: 'Mobile Financial Service', accountId: 'acc_sample_bkash', toAccountId: 'acc_sample_nagad', timestamp: tsAt(8), notes: 'Sample wallet-to-wallet transfer', isRecurring: false, payeeOrPayer: 'Self Transfer', debtId: null },
    { id: 'tx_sample_exp_food_dinner', type: 'EXPENSE', amount: 1650, title: 'Family Weekend Dinner', category: 'Food & Dining', subcategory: 'Restaurant', accountId: 'acc_sample_cash', toAccountId: null, timestamp: tsAt(9), notes: 'Sample dinner out', isRecurring: false, payeeOrPayer: 'Spice Garden Cafe', debtId: null },
    { id: 'tx_sample_exp_food_coffee', type: 'EXPENSE', amount: 480, title: 'Evening Coffee & Snacks', category: 'Food & Dining', subcategory: 'Cafes & Coffee', accountId: 'acc_sample_bkash', toAccountId: null, timestamp: tsAt(10), notes: 'Sample cafe visit', isRecurring: false, payeeOrPayer: 'North End Roasters', debtId: null },
    { id: 'tx_sample_exp_shopping_clothes', type: 'EXPENSE', amount: 6500, title: 'Seasonal Apparel Purchase', category: 'Shopping', subcategory: 'Clothing', accountId: 'acc_sample_card', toAccountId: null, timestamp: tsAt(11), notes: 'Sample clothing purchase', isRecurring: false, payeeOrPayer: 'Aarong', debtId: null },
    { id: 'tx_sample_exp_shopping_elec', type: 'EXPENSE', amount: 4200, title: 'Wireless Earbuds', category: 'Shopping', subcategory: 'Electronics', accountId: 'acc_sample_card', toAccountId: null, timestamp: tsAt(12), notes: 'Sample electronics purchase', isRecurring: false, payeeOrPayer: 'Gadget Galaxy', debtId: null },
    { id: 'tx_sample_exp_transport', type: 'EXPENSE', amount: 950, title: 'City Ride Sharing', category: 'Transportation', subcategory: 'Ride Sharing', accountId: 'acc_sample_bkash', toAccountId: null, timestamp: tsAt(13), notes: 'Sample daily commute rides', isRecurring: false, payeeOrPayer: 'Pathao Rides', debtId: null },
    { id: 'tx_sample_exp_rent', type: 'EXPENSE', amount: 18000, title: 'Apartment Monthly Rent', category: 'Rent & Utilities', subcategory: 'House Rent', accountId: 'acc_sample_bank', toAccountId: null, timestamp: tsAt(14), notes: 'Sample monthly house rent', isRecurring: true, payeeOrPayer: 'Skyline Properties', debtId: null },
    { id: 'tx_sample_exp_internet', type: 'EXPENSE', amount: 1200, title: 'Broadband Fiber Internet Bill', category: 'Rent & Utilities', subcategory: 'Internet', accountId: 'acc_sample_bkash', toAccountId: null, timestamp: tsAt(15), notes: 'Sample monthly internet bill', isRecurring: true, payeeOrPayer: 'AmberIT', debtId: null },
    { id: 'tx_sample_exp_health', type: 'EXPENSE', amount: 1450, title: 'Pharmacy Medicines & Vitamins', category: 'Health & Medical', subcategory: 'Medicines', accountId: 'acc_sample_nagad', toAccountId: null, timestamp: tsAt(16), notes: 'Sample pharmacy bill', isRecurring: false, payeeOrPayer: 'Lazz Pharma', debtId: null },
    { id: 'tx_sample_exp_entertainment', type: 'EXPENSE', amount: 850, title: 'Streaming Subscription Bundle', category: 'Entertainment', subcategory: 'Streaming Services', accountId: 'acc_sample_card', toAccountId: null, timestamp: tsAt(17), notes: 'Sample subscription', isRecurring: true, payeeOrPayer: 'StreamHub', debtId: null },
    { id: 'tx_sample_exp_personal_care', type: 'EXPENSE', amount: 750, title: 'Haircut & Grooming', category: 'Personal Care', subcategory: 'Salon & Grooming', accountId: 'acc_sample_cash', toAccountId: null, timestamp: tsAt(18), notes: 'Sample salon service', isRecurring: false, payeeOrPayer: 'Urban Grooming Studio', debtId: null },
    { id: 'tx_sample_exp_groceries_veg', type: 'EXPENSE', amount: 3200, title: 'Fresh Vegetables & Fish Market', category: 'Groceries', subcategory: 'Produce & Vegetables', accountId: 'acc_sample_cash', toAccountId: null, timestamp: tsAt(19), notes: 'Sample weekly groceries', isRecurring: false, payeeOrPayer: 'Green Harvest Market', debtId: null },
    { id: 'tx_sample_exp_groceries_pantry', type: 'EXPENSE', amount: 2100, title: 'Rice, Lentils & Cooking Oil', category: 'Groceries', subcategory: 'Pantry Staples', accountId: 'acc_sample_nagad', toAccountId: null, timestamp: tsAt(20), notes: 'Sample pantry restock', isRecurring: false, payeeOrPayer: 'Shwapno Superstore', debtId: null },
    { id: 'tx_sample_exp_travel', type: 'EXPENSE', amount: 5500, title: 'Weekend Resort Booking', category: 'Travel', subcategory: 'Hotel & Lodging', accountId: 'acc_sample_bank', toAccountId: null, timestamp: tsAt(21), notes: 'Sample weekend trip', isRecurring: false, payeeOrPayer: 'Sylhet Valley Resort', debtId: null },
    { id: 'tx_sample_exp_family', type: 'EXPENSE', amount: 6000, title: 'Parents Monthly Allowance', category: 'Family', subcategory: 'Parents Support', accountId: 'acc_sample_nagad', toAccountId: null, timestamp: tsAt(22), notes: 'Sample family allowance', isRecurring: true, payeeOrPayer: 'Parents', debtId: null },
    { id: 'tx_sample_exp_other', type: 'EXPENSE', amount: 1000, title: 'Community Charity Contribution', category: 'Other Expenses', subcategory: 'Donations & Charity', accountId: 'acc_sample_cash', toAccountId: null, timestamp: tsAt(23), notes: 'Sample charitable donation', isRecurring: false, payeeOrPayer: 'Local Community Welfare', debtId: null },
    { id: 'tx_sample_cc_payment', type: 'CC_PAYMENT', amount: 6500, title: 'Credit Card Statement Payment', category: 'Bank Transfer', subcategory: 'Account to Account', accountId: 'acc_sample_bank', toAccountId: 'acc_sample_card', timestamp: tsAt(24), notes: 'Sample credit card bill payment', isRecurring: false, payeeOrPayer: 'Standard Chartered Bank', debtId: null },
    { id: 'tx_sample_borrow_arian', type: 'BORROW', amount: 18000, title: 'Medical Emergency Loan Borrowed', category: 'Other Income', subcategory: 'Miscellaneous', accountId: 'acc_sample_bank', toAccountId: null, timestamp: tsAt(25), notes: 'Borrowed from Arian Chowdhury [Debt:debt_sample_borrow_arian]', isRecurring: false, payeeOrPayer: 'Arian Chowdhury', debtId: 'debt_sample_borrow_arian' },
    { id: 'tx_sample_repay_arian_1', type: 'EXPENSE', amount: 6000, title: 'Loan 1st Installment Repayment', category: 'Debt Repayment', subcategory: 'Installment (EMI)', accountId: 'acc_sample_bank', toAccountId: null, timestamp: tsAt(26), notes: 'Partial repayment to Arian Chowdhury [Debt:debt_sample_borrow_arian]', isRecurring: false, payeeOrPayer: 'Arian Chowdhury', debtId: 'debt_sample_borrow_arian' },
    { id: 'tx_sample_lend_nabila', type: 'LEND', amount: 9000, title: 'Education Support Loan Lent', category: 'Other Expenses', subcategory: 'General Miscellaneous', accountId: 'acc_sample_bkash', toAccountId: null, timestamp: tsAt(26), notes: 'Lent to Nabila Rahman [Debt:debt_sample_lend_nabila]', isRecurring: false, payeeOrPayer: 'Nabila Rahman', debtId: 'debt_sample_lend_nabila' },
    { id: 'tx_sample_collect_nabila_1', type: 'INCOME', amount: 4000, title: 'Loan Partial Repayment Received Back', category: 'Other Income', subcategory: 'Miscellaneous', accountId: 'acc_sample_bkash', toAccountId: null, timestamp: tsAt(27), notes: 'Partial repayment from Nabila Rahman [Debt:debt_sample_lend_nabila]', isRecurring: false, payeeOrPayer: 'Nabila Rahman', debtId: 'debt_sample_lend_nabila' },
  ];

  const baseAccounts: AccountEntity[] = [
    { id: 'acc_sample_cash', name: 'Cash Wallet', type: 'CASH', institution: 'Physical Cash', balance: 8000, openingBalance: 8000, accountNumberLast4: '', colorHex: '#10B981', iconName: 'payments', isHidden: false, sortOrder: 0, creditLimit: 0, billingDate: '', paymentDueDate: '', minPayment: 0, notes: 'Daily pocket & household cash', includeInTotal: true },
    { id: 'acc_sample_bkash', name: 'bKash Personal', type: 'MFS', institution: 'bKash Limited', balance: 18000, openingBalance: 18000, accountNumberLast4: '0171', colorHex: '#E2136E', iconName: 'phone_android', isHidden: false, sortOrder: 1, creditLimit: 0, billingDate: '', paymentDueDate: '', minPayment: 0, notes: 'Mobile wallet for daily payments', includeInTotal: true },
    { id: 'acc_sample_nagad', name: 'Nagad Personal', type: 'MFS', institution: 'Nagad Limited', balance: 12000, openingBalance: 12000, accountNumberLast4: '0182', colorHex: '#F26522', iconName: 'phone_android', isHidden: false, sortOrder: 2, creditLimit: 0, billingDate: '', paymentDueDate: '', minPayment: 0, notes: 'Secondary mobile wallet', includeInTotal: true },
    { id: 'acc_sample_bank', name: 'City Bank Debit Card', type: 'BANK', institution: 'City Bank PLC', balance: 45000, openingBalance: 45000, accountNumberLast4: '4821', colorHex: '#2563EB', iconName: 'account_balance', isHidden: false, sortOrder: 3, creditLimit: 0, billingDate: '', paymentDueDate: '', minPayment: 0, notes: 'Subtype:Salary Account | Network:Visa', includeInTotal: true },
    { id: 'acc_sample_card', name: 'Standard Visa Platinum', type: 'CREDIT_CARD', institution: 'Standard Chartered', balance: 0, openingBalance: 0, accountNumberLast4: '9204', colorHex: '#8B5CF6', iconName: 'credit_card', isHidden: false, sortOrder: 4, creditLimit: 150000, billingDate: '15', paymentDueDate: '05', minPayment: 2500, notes: 'Network:Visa', includeInTotal: true },
  ];

  const accounts = baseAccounts.map((acc) => {
    const delta = transactions.reduce((sum, tx) => sum + computeSingleTxBalanceDelta(tx, acc.id), 0);
    return { ...acc, balance: acc.openingBalance + delta };
  });

  const budgets: BudgetEntity[] = [
    { id: 'bgt_sample_food', categoryName: 'Food & Dining', monthlyLimit: 6000, monthYear: currentMonthKey, isOverall: false, rolloverEnabled: false, name: 'Food & Dining', subcategoryName: '', iconName: 'restaurant', colorHex: '#F59E0B', alertPercentage: 80 },
    { id: 'bgt_sample_groceries', categoryName: 'Groceries', monthlyLimit: 10000, monthYear: currentMonthKey, isOverall: false, rolloverEnabled: false, name: 'Groceries', subcategoryName: '', iconName: 'shopping_cart', colorHex: '#10B981', alertPercentage: 80 },
    { id: 'bgt_sample_rent', categoryName: 'Rent & Utilities', monthlyLimit: 22000, monthYear: currentMonthKey, isOverall: false, rolloverEnabled: false, name: 'Rent & Utilities', subcategoryName: '', iconName: 'home', colorHex: '#3B82F6', alertPercentage: 85 },
    { id: 'bgt_sample_shopping', categoryName: 'Shopping', monthlyLimit: 12000, monthYear: currentMonthKey, isOverall: false, rolloverEnabled: false, name: 'Shopping', subcategoryName: '', iconName: 'shopping_bag', colorHex: '#EC4899', alertPercentage: 80 },
    { id: 'bgt_sample_transport', categoryName: 'Transportation', monthlyLimit: 3000, monthYear: currentMonthKey, isOverall: false, rolloverEnabled: false, name: 'Transportation', subcategoryName: '', iconName: 'directions_car', colorHex: '#6366F1', alertPercentage: 80 },
  ];

  const debts: DebtEntity[] = [
    { id: 'debt_sample_borrow_arian', personName: 'Arian Chowdhury', amount: 12000, totalAmount: 18000, paidAmount: 6000, type: 'BORROWED', dueDate: dateDays(45), notes: 'Sample medical support loan (1 installment paid)', isSettled: false, accountId: 'acc_sample_bank', reason: 'Medical Emergency', colorHex: '#EF4444', tentativeCloseDateStr: dateDays(45), tags: 'Medical, Installment' },
    { id: 'debt_sample_lend_nabila', personName: 'Nabila Rahman', amount: 5000, totalAmount: 9000, paidAmount: 4000, type: 'LENT', dueDate: dateDays(30), notes: 'Sample college education loan', isSettled: false, accountId: 'acc_sample_bkash', reason: 'Semester Fees', colorHex: '#3B82F6', tentativeCloseDateStr: dateDays(30), tags: 'Education, Receivable' },
  ];

  const savingsGoals: SavingsGoalEntity[] = [
    { id: 'goal_sample_emergency', name: 'Emergency Reserve Fund', targetAmount: 100000, savedAmount: 45000, themeColorHex: '#06B6D4', iconName: 'savings', targetDeadline: referenceTimeMillis + 180 * 86_400_000, targetDeadlineStr: dateDays(180), createdAt: monthStart, isCompleted: false },
    { id: 'goal_sample_workstation', name: 'Home Workstation Upgrade', targetAmount: 35000, savedAmount: 35000, themeColorHex: '#10B981', iconName: 'laptop_mac', targetDeadline: referenceTimeMillis, targetDeadlineStr: dateDays(0), createdAt: monthStart, isCompleted: true },
  ];

  return JSON.stringify(
    {
      appName: 'Hishab Pati',
      schemaVersion: 1,
      backupDate: new Date(referenceTimeMillis).toISOString(),
      currency: 'BDT',
      settings: {
        userName: 'Demo User',
        country: 'Bangladesh',
        currencyCode: 'BDT',
        currencySymbol: '৳',
        language: 'ENGLISH',
        themeMode: 'AUTO',
        themeColor: 'SKY_CYAN',
        backgroundTexture: 'AURORA',
      },
      accounts,
      transactions,
      categories,
      subcategories,
      budgets,
      debts,
      savingsGoals,
    },
    null,
    2
  );
}
