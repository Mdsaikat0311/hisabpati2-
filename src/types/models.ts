export type AccountType = 'BANK' | 'CREDIT_CARD' | 'CASH' | 'MFS' | 'OTHER';

export type TransactionType =
  | 'EXPENSE'
  | 'INCOME'
  | 'TRANSFER'
  | 'LEND'
  | 'BORROW'
  | 'CC_PAYMENT';

export type DebtType = 'LENT' | 'BORROWED';

export type AppLanguage = 'ENGLISH' | 'BANGLA';

export type ThemeMode = 'AUTO' | 'LIGHT' | 'DARK';

export type ThemeColorOption =
  | 'INDIGO_NIGHT'
  | 'ROYAL_VIOLET'
  | 'EMERALD_GREEN'
  | 'OCEAN_BLUE'
  | 'SUNSET_ORANGE'
  | 'ROSE_PINK'
  | 'AQUA_TEAL'
  | 'GOLDEN_AMBER'
  | 'CRIMSON_RED'
  | 'LIME_FRESH'
  | 'SKY_CYAN'
  | 'CORAL_PEACH'
  | 'GRAPHITE';

export type BackgroundTextureOption =
  | 'AURORA'
  | 'WAVES'
  | 'DOTS'
  | 'GRID'
  | 'SILK_LINES'
  | 'PLAIN'
  | 'COLOUR_MESH';

export type AccountSortOption =
  | 'CUSTOM'
  | 'BALANCE_DESC'
  | 'BALANCE_ASC'
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'TYPE';

export type PrimaryTab = 'HOME' | 'REPORT' | 'SETTINGS';

export type SubScreen =
  | 'ACCOUNTS'
  | 'ACCOUNT_DETAIL'
  | 'EDIT_ACCOUNT'
  | 'ADJUST_BALANCE'
  | 'ADD_TRANSACTION'
  | 'SETTINGS'
  | 'PROFILE'
  | 'THEME'
  | 'CATEGORIES'
  | 'CURRENCY_SELECTION'
  | 'BACKUP_RESTORE'
  | 'NOTIFICATIONS'
  | 'NOTIFICATION_MANAGER'
  | 'ABOUT'
  | 'BUDGET_DASHBOARD'
  | 'ADD_BUDGET'
  | 'BUDGET_DETAILS'
  | 'MANAGE_DEBTS'
  | 'DEBT_DETAILS'
  | 'ADD_DEBT'
  | 'ADD_DEBT_TRANSACTION'
  | 'NEW_SAVINGS_GOAL'
  | 'CURRENCY_CONVERTER'
  | 'MONTHLY_RECAP'
  | 'SPENDING_COMPARISON'
  | 'INCOME_TRACKER'
  | 'CALENDAR'
  | 'CARDS_MANAGER';

export interface AccountEntity {
  id: string;
  name: string;
  type: AccountType;
  institution: string;
  balance: number;
  openingBalance: number;
  accountNumberLast4: string;
  colorHex: string;
  iconName: string;
  isHidden: boolean;
  sortOrder: number;
  creditLimit: number;
  billingDate: string;
  paymentDueDate: string;
  minPayment: number;
  notes: string;
  includeInTotal: boolean;
}

export interface TransactionEntity {
  id: string;
  type: TransactionType;
  amount: number;
  title: string;
  category: string;
  subcategory: string;
  accountId: string;
  toAccountId: string | null;
  timestamp: number;
  notes: string;
  isRecurring: boolean;
  payeeOrPayer: string;
  debtId: string | null;
}

export interface CategoryEntity {
  id: string;
  name: string;
  nameBn: string;
  isIncome: boolean;
  isTransfer: boolean;
  isActive: boolean;
  iconName: string;
  colorHex: string;
  sortOrder: number;
}

export interface SubcategoryEntity {
  id: string;
  categoryId: string;
  name: string;
  nameBn: string;
  sortOrder: number;
}

export interface BudgetEntity {
  id: string;
  categoryName: string;
  monthlyLimit: number;
  monthYear: string;
  isOverall: boolean;
  rolloverEnabled: boolean;
  name: string;
  subcategoryName: string;
  iconName: string;
  colorHex: string;
  alertPercentage: number;
}

export interface DebtEntity {
  id: string;
  personName: string;
  amount: number;
  totalAmount: number;
  paidAmount: number;
  type: DebtType;
  dueDate: string;
  notes: string;
  isSettled: boolean;
  accountId: string | null;
  reason: string;
  colorHex: string;
  tentativeCloseDateStr: string;
  tags: string;
}

export interface SavingsGoalEntity {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  themeColorHex: string;
  iconName: string;
  targetDeadline: number | null;
  targetDeadlineStr: string;
  createdAt: number;
  isCompleted: boolean;
}

export interface AppSettingsEntity {
  id: string;
  userName: string;
  country: string;
  currencyCode: string;
  currencySymbol: string;
  language: AppLanguage;
  themeMode: ThemeMode;
  themeColor: ThemeColorOption;
  backgroundTexture: BackgroundTextureOption;
  appLockEnabled: boolean;
  screenshotProtectionEnabled: boolean;
  notificationsEnabled: boolean;
}

export type HomeCardStyle = 'GRID' | 'STACK' | 'CAROUSEL';
export type BalanceCardStyle = 'STANDARD' | 'GRADIENT';
export type HomeSectionKey =
  | 'budget'
  | 'bills'
  | 'recent_activity'
  | 'savings'
  | 'financial_health'
  | 'smart_insights'
  | 'top_spending'
  | 'spending_by_day'
  | 'spending_streak'
  | 'shortcuts';

export interface HomeCustomization {
  cardStyle: HomeCardStyle;
  balanceCardStyle: BalanceCardStyle;
  sectionOrder: HomeSectionKey[];
  visibleSections: HomeSectionKey[];
}

export interface SpendingWayItem {
  id: string;
  name: string;
  subWays?: string[];
}

export interface ExtendedSettingsState {
  profileAvatarId: string;
  profileAvatarBgHex: string;
  profileCustomName: string;
  defaultWalletId: string | null;
  autoOpenAmountKeypad: boolean;
  budgetAlertEnabled: boolean;
  debtAlertEnabled: boolean;
  billReminderEnabled: boolean;
  creditCardDueEnabled: boolean;
  weeklySummaryEnabled: boolean;
  autoBackupEnabled: boolean;
  lastAutoBackupMillis: number;
  screenLockPin: string;
  customBanks: string[];
  customMfsProviders: Array<{ name: string; brandColorHex: string }>;
  spendingWays?: SpendingWayItem[];
}

export interface CloudBackupInfo {
  backupDate: string;
  uploadedAtTimestamp: number;
  accountsCount: number;
  transactionsCount: number;
  categoriesCount: number;
  debtsCount: number;
  fileSizeBytes: number;
}

export type SmartNotificationType = 'BILL_DUE' | 'BUDGET_ALERT' | 'DEBT_DUE' | 'INSIGHT';

export interface SmartNotification {
  id: string;
  type: SmartNotificationType;
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  relatedId?: string;
}

export type InsightsPeriod = 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_3_MONTHS' | 'THIS_YEAR' | 'CUSTOM';

export interface ActivityFilterState {
  searchQuery: string;
  typeFilter: TransactionType | 'ALL';
  accountIds: string[];
  categoryNames: string[];
  datePreset: 'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'CUSTOM';
  startDate: number | null;
  endDate: number | null;
  sortBy: 'NEWEST' | 'OLDEST' | 'HIGHEST' | 'LOWEST';
}

export interface CurrencyOption {
  code: string;
  name: string;
  nameBn: string;
  symbol: string;
  flag: string;
}

export interface CurrencyInfo {
  code: string;
  nameEn: string;
  nameBn: string;
  countryKeywords: string;
  symbol: string;
  flag: string;
  defaultRatePerUsd: number;
}
