import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import type {
  AccountEntity,
  AccountSortOption,
  AppSettingsEntity,
  BudgetEntity,
  CategoryEntity,
  CloudBackupInfo,
  DebtEntity,
  ExtendedSettingsState,
  HomeCustomization,
  HomeSectionKey,
  PrimaryTab,
  SavingsGoalEntity,
  SmartNotification,
  SpendingWayItem,
  SubcategoryEntity,
  SubScreen,
  TransactionEntity,
  TransactionType,
} from '../types/models';
import {
  getDefaultCategories,
  getDefaultFourCoreAccounts,
  getDefaultSpendingWays,
} from '../data/initialData';
import { getThemeColors } from '../data/categoryCatalog';
import { applyBalanceEffect } from '../utils/analytics';
import {
  createBackupJson,
  exportToCsv,
  generateSampleJsonTemplate,
  parseAndMigrateBackup,
  type NormalizedBackupPayload,
  type RestoreStage,
} from '../utils/backup';
import {
  generateSmartNotifications,
  loadReadNotificationIds,
  saveReadNotificationIds,
} from '../services/notifications';
import {
  deleteAllCloudUserData,
  deleteCloudAccount,
  deleteCloudTransaction,
  fetchLatestCloudBackup,
  observeCloudAccounts,
  observeCloudTransactions,
  registerWithEmailPassword,
  reloadCurrentUser,
  resendVerificationEmail,
  saveCloudAccount,
  saveCloudBackup,
  saveCloudTransaction,
  sendPasswordReset,
  signInWithEmailPassword,
  signInWithGooglePopup,
  signOutGoogle,
  subscribeAuthState,
  syncLocalDataToCloud,
  testFirestoreConnection,
} from '../firebase';

const STORAGE_KEY = 'hishab_pati_web_state_v1';

export interface SubScreenEntry {
  screen: SubScreen;
  params?: Record<string, string>;
}

export interface AddTransactionParams {
  editingTx?: TransactionEntity | null;
  initialType?: TransactionType;
  preselectedAccountId?: string;
  preselectedToAccountId?: string;
  initialCategory?: string;
  initialSubcategory?: string;
  initialAmount?: number;
  initialTitle?: string;
  initialMode?: 'default' | 'voice' | 'receipt';
}

export interface SnackbarState {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const DEFAULT_SECTION_ORDER: HomeSectionKey[] = [
  'budget',
  'bills',
  'recent_activity',
  'savings',
  'financial_health',
  'smart_insights',
  'top_spending',
  'spending_by_day',
  'spending_streak',
  'shortcuts',
];

export const DEFAULT_HOME_CUSTOMIZATION: HomeCustomization = {
  cardStyle: 'GRID',
  balanceCardStyle: 'STANDARD',
  sectionOrder: DEFAULT_SECTION_ORDER,
  visibleSections: ['budget', 'bills', 'recent_activity'],
};

const DEFAULT_SETTINGS: AppSettingsEntity = {
  id: 'default',
  userName: 'User',
  country: 'Bangladesh',
  currencyCode: 'BDT',
  currencySymbol: '৳',
  language: 'BANGLA',
  themeMode: 'AUTO',
  themeColor: 'SKY_CYAN',
  backgroundTexture: 'AURORA',
  appLockEnabled: false,
  screenshotProtectionEnabled: false,
  notificationsEnabled: true,
};

const DEFAULT_EXTENDED_SETTINGS: ExtendedSettingsState = {
  profileAvatarId: 'user',
  profileAvatarBgHex: '#0284C7',
  profileCustomName: '',
  defaultWalletId: null,
  autoOpenAmountKeypad: true,
  budgetAlertEnabled: true,
  debtAlertEnabled: true,
  billReminderEnabled: true,
  creditCardDueEnabled: true,
  weeklySummaryEnabled: true,
  autoBackupEnabled: false,
  lastAutoBackupMillis: 0,
  screenLockPin: '',
  customBanks: [],
  customMfsProviders: [],
  spendingWays: getDefaultSpendingWays('BANGLA'),
};

interface PersistedState {
  guestMode: boolean;
  coreInitialized?: boolean;
  settings: AppSettingsEntity;
  extendedSettings: ExtendedSettingsState;
  homeCustomization: HomeCustomization;
  accountSortOption: AccountSortOption;
  accounts: AccountEntity[];
  transactions: TransactionEntity[];
  categories: CategoryEntity[];
  subcategories: SubcategoryEntity[];
  budgets: BudgetEntity[];
  debts: DebtEntity[];
  savingsGoals: SavingsGoalEntity[];
}

function mergeBuiltInCategories(
  existingCats: CategoryEntity[],
  existingSubs: SubcategoryEntity[]
): { categories: CategoryEntity[]; subcategories: SubcategoryEntity[] } {
  const defaults = getDefaultCategories();
  const catIds = new Set(existingCats.map((c) => c.id));
  const mergedCats = [...existingCats];
  for (const d of defaults.categories) {
    if (!catIds.has(d.id)) mergedCats.push(d);
  }
  const subIds = new Set(existingSubs.map((s) => s.id));
  const mergedSubs = [...existingSubs];
  for (const s of defaults.subcategories) {
    if (!subIds.has(s.id)) mergedSubs.push(s);
  }
  return { categories: mergedCats, subcategories: mergedSubs };
}

function loadInitialPersistedState(): PersistedState {
  const defaults = getDefaultCategories();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      const mergedSettings = { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) };
      const existingAccs = Array.isArray(parsed.accounts) ? parsed.accounts : [];
      const shouldSeedCore = !parsed.coreInitialized && existingAccs.length === 0;
      const seededAccs = shouldSeedCore
        ? getDefaultFourCoreAccounts(mergedSettings.language)
        : existingAccs;
      const mergedTaxonomy =
        Array.isArray(parsed.categories) && parsed.categories.length > 0
          ? mergeBuiltInCategories(
              parsed.categories,
              Array.isArray(parsed.subcategories) ? parsed.subcategories : []
            )
          : defaults;

      const rawExtended: Partial<ExtendedSettingsState> = parsed.extendedSettings ?? {};
      const resolvedWays =
        Array.isArray(rawExtended.spendingWays) && rawExtended.spendingWays.length > 0
          ? rawExtended.spendingWays
          : getDefaultSpendingWays(mergedSettings.language);
      return {
        guestMode: Boolean(parsed.guestMode ?? false),
        coreInitialized: true,
        settings: mergedSettings,
        extendedSettings: {
          ...DEFAULT_EXTENDED_SETTINGS,
          ...rawExtended,
          spendingWays: resolvedWays,
        },
        homeCustomization: {
          ...DEFAULT_HOME_CUSTOMIZATION,
          ...(parsed.homeCustomization ?? {}),
          cardStyle: parsed.homeCustomization?.cardStyle ?? DEFAULT_HOME_CUSTOMIZATION.cardStyle,
          sectionOrder:
            parsed.homeCustomization?.sectionOrder?.length
              ? parsed.homeCustomization.sectionOrder
              : DEFAULT_SECTION_ORDER,
          visibleSections:
            parsed.homeCustomization?.visibleSections ?? DEFAULT_HOME_CUSTOMIZATION.visibleSections,
        },
        accountSortOption: parsed.accountSortOption ?? 'CUSTOM',
        accounts: seededAccs,
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        categories: mergedTaxonomy.categories,
        subcategories: mergedTaxonomy.subcategories,
        budgets: Array.isArray(parsed.budgets) ? parsed.budgets : [],
        debts: Array.isArray(parsed.debts) ? parsed.debts : [],
        savingsGoals: Array.isArray(parsed.savingsGoals) ? parsed.savingsGoals : [],
      };
    }
  } catch {
    // ignore corrupted local storage
  }
  return {
    guestMode: false,
    coreInitialized: true,
    settings: DEFAULT_SETTINGS,
    extendedSettings: DEFAULT_EXTENDED_SETTINGS,
    homeCustomization: DEFAULT_HOME_CUSTOMIZATION,
    accountSortOption: 'CUSTOM',
    accounts: getDefaultFourCoreAccounts(DEFAULT_SETTINGS.language),
    transactions: [],
    categories: defaults.categories,
    subcategories: defaults.subcategories,
    budgets: [],
    debts: [],
    savingsGoals: [],
  };
}

interface WalletContextValue {
  authUser: User | null;
  authReady: boolean;
  guestMode: boolean;
  isLocked: boolean;
  unlockApp: (pin: string) => boolean;
  enterGuestMode: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  sendResetPasswordEmail: (email: string) => Promise<void>;
  refreshAuthSession: () => Promise<boolean>;
  signOutUser: () => Promise<void>;

  settings: AppSettingsEntity;
  extendedSettings: ExtendedSettingsState;
  homeCustomization: HomeCustomization;
  accountSortOption: AccountSortOption;
  isDarkTheme: boolean;

  accounts: AccountEntity[];
  transactions: TransactionEntity[];
  categories: CategoryEntity[];
  subcategories: SubcategoryEntity[];
  budgets: BudgetEntity[];
  debts: DebtEntity[];
  savingsGoals: SavingsGoalEntity[];
  notifications: SmartNotification[];
  unreadNotificationsCount: number;

  activeTab: PrimaryTab;
  subScreenStack: SubScreenEntry[];
  currentSubScreen: SubScreenEntry | null;
  txLaunchParams: AddTransactionParams;

  snackbar: SnackbarState | null;
  showSnackbar: (message: string, actionLabel?: string, onAction?: () => void) => void;
  dismissSnackbar: () => void;

  navigateToTab: (tab: PrimaryTab) => void;
  openSubScreen: (screen: SubScreen, params?: Record<string, string>) => void;
  closeSubScreen: () => void;
  replaceSubScreen: (screen: SubScreen, params?: Record<string, string>) => void;
  popToRoot: () => void;
  openAddTransaction: (params?: AddTransactionParams) => void;

  updateSettings: (partial: Partial<AppSettingsEntity>) => void;
  updateExtendedSettings: (partial: Partial<ExtendedSettingsState>) => void;
  updateHomeCustomization: (partial: Partial<HomeCustomization>) => void;
  resetHomeCustomization: () => void;
  setAccountSortOption: (opt: AccountSortOption) => void;

  addAccount: (account: Omit<AccountEntity, 'id' | 'sortOrder'> & { id?: string }) => AccountEntity;
  updateAccount: (account: AccountEntity) => void;
  deleteAccount: (accountId: string) => void;
  toggleArchiveAccount: (accountId: string) => void;
  adjustAccountBalance: (accountId: string, newBalance: number, createAdjustmentTx?: boolean) => void;
  reorderAccounts: (orderedIds: string[]) => void;
  restoreCoreCards: () => number;

  addTransaction: (tx: Omit<TransactionEntity, 'id'> & { id?: string }) => TransactionEntity;
  updateTransaction: (updated: TransactionEntity) => void;
  deleteTransaction: (txId: string) => void;

  addCategory: (cat: Omit<CategoryEntity, 'id' | 'sortOrder'>, initialSubs?: string[]) => CategoryEntity;
  updateCategory: (cat: CategoryEntity) => void;
  deleteCategory: (categoryId: string) => void;
  reorderCategories: (orderedIds: string[]) => void;
  restoreDefaultCategories: () => void;
  addSubcategory: (categoryId: string, name: string, nameBn?: string) => void;
  deleteSubcategory: (subId: string) => void;
  spendingWays: SpendingWayItem[];
  addSpendingWay: (name: string) => SpendingWayItem | null;
  updateSpendingWay: (id: string, name: string) => void;
  deleteSpendingWay: (id: string) => void;

  saveBudget: (budget: Omit<BudgetEntity, 'id'> & { id?: string }) => void;
  deleteBudget: (budgetId: string) => void;

  addDebt: (debt: Omit<DebtEntity, 'id'>, logWalletTx?: boolean) => DebtEntity;
  updateDebt: (debt: DebtEntity) => void;
  deleteDebt: (debtId: string) => void;
  recordDebtTransaction: (params: {
    debtId: string;
    action: 'PAYMENT' | 'BORROW_MORE' | 'LEND_MORE' | 'INTEREST';
    amount: number;
    accountId: string | null;
    notes?: string;
    timestamp?: number;
  }) => void;
  markDebtSettled: (debtId: string) => void;

  addSavingsGoal: (goal: Omit<SavingsGoalEntity, 'id' | 'createdAt' | 'isCompleted'>) => void;
  updateSavingsGoal: (goal: SavingsGoalEntity) => void;
  deleteSavingsGoal: (goalId: string) => void;
  contributeToGoal: (goalId: string, amount: number, sourceAccountId?: string | null) => void;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  exportJsonBackup: () => string;
  exportCsvBackup: () => string;
  exportSampleJson: () => string;
  parseBackupPreview: (rawText: string) => NormalizedBackupPayload;
  applyRestoredBackup: (
    payload: NormalizedBackupPayload,
    onStage?: (stage: RestoreStage, pct: number, msg: string) => void
  ) => Promise<void>;
  uploadCloudBackup: () => Promise<void>;
  fetchCloudBackupPreview: () => Promise<{ jsonString: string; info: CloudBackupInfo } | null>;
  syncCloudNow: () => Promise<void>;
  clearAllData: (includeCloud: boolean) => Promise<void>;
  loadSampleDataset: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const initial = useMemo(() => loadInitialPersistedState(), []);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authVersion, setAuthVersion] = useState(0);
  const [authReady, setAuthReady] = useState(false);
  const [guestMode, setGuestMode] = useState<boolean>(initial.guestMode);
  const [isLocked, setIsLocked] = useState<boolean>(
    Boolean(initial.settings.appLockEnabled && initial.extendedSettings.screenLockPin)
  );

  const [settings, setSettings] = useState<AppSettingsEntity>(initial.settings);
  const [extendedSettings, setExtendedSettings] = useState<ExtendedSettingsState>(
    initial.extendedSettings
  );
  const [homeCustomization, setHomeCustomization] = useState<HomeCustomization>(
    initial.homeCustomization
  );
  const [accountSortOption, setAccountSortOption] = useState<AccountSortOption>(
    initial.accountSortOption
  );

  const [accounts, setAccounts] = useState<AccountEntity[]>(initial.accounts);
  const [transactions, setTransactions] = useState<TransactionEntity[]>(initial.transactions);
  const [categories, setCategories] = useState<CategoryEntity[]>(initial.categories);
  const [subcategories, setSubcategories] = useState<SubcategoryEntity[]>(initial.subcategories);
  const [budgets, setBudgets] = useState<BudgetEntity[]>(initial.budgets);
  const [debts, setDebts] = useState<DebtEntity[]>(initial.debts);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoalEntity[]>(initial.savingsGoals);
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(() => loadReadNotificationIds());

  const [activeTab, setActiveTab] = useState<PrimaryTab>('HOME');
  const [subScreenStack, setSubScreenStack] = useState<SubScreenEntry[]>([]);
  const [txLaunchParams, setTxLaunchParams] = useState<AddTransactionParams>({});
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );

  const accountsRef = useRef(accounts);
  const transactionsRef = useRef(transactions);
  accountsRef.current = accounts;
  transactionsRef.current = transactions;

  // System dark mode listener
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const isDarkTheme =
    settings.themeMode === 'DARK' || (settings.themeMode === 'AUTO' && systemDark);

  // Apply Tailwind dark class & CSS accent variables
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkTheme) root.classList.add('dark');
    else root.classList.remove('dark');
    const colors = getThemeColors(settings.themeColor);
    root.style.setProperty('--app-primary', colors.primary);
    root.style.setProperty('--app-secondary', colors.secondary);
  }, [isDarkTheme, settings.themeColor]);

  // Persist to localStorage
  useEffect(() => {
    try {
      const state: PersistedState = {
        guestMode,
        coreInitialized: true,
        settings,
        extendedSettings,
        homeCustomization,
        accountSortOption,
        accounts,
        transactions,
        categories,
        subcategories,
        budgets,
        debts,
        savingsGoals,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage errors
    }
  }, [
    guestMode,
    settings,
    extendedSettings,
    homeCustomization,
    accountSortOption,
    accounts,
    transactions,
    categories,
    subcategories,
    budgets,
    debts,
    savingsGoals,
  ]);

  // Firebase Auth & Firestore connectivity
  useEffect(() => {
    void testFirestoreConnection();
    const unsub = subscribeAuthState((user) => {
      setAuthUser(user);
      setAuthReady(true);
      if (user) {
        setGuestMode(false);
        setSettings((prev) => ({
          ...prev,
          userName: prev.userName === 'User' && user.displayName ? user.displayName : prev.userName,
        }));
      }
    });
    return unsub;
  }, []);

  // Firestore real-time listeners when authenticated and verified
  useEffect(() => {
    if (!authUser || !authUser.emailVerified) return;
    const unsubAcc = observeCloudAccounts(authUser.uid, (cloudAccs) => {
      if (cloudAccs.length > 0) {
        setAccounts((localAccs) => {
          const mergedMap = new Map(localAccs.map((a) => [a.id, a]));
          for (const ca of cloudAccs) mergedMap.set(ca.id, ca);
          return Array.from(mergedMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
        });
      }
    });
    const unsubTx = observeCloudTransactions(authUser.uid, (cloudTxs) => {
      if (cloudTxs.length > 0) {
        setTransactions((localTxs) => {
          const mergedMap = new Map(localTxs.map((t) => [t.id, t]));
          for (const ct of cloudTxs) mergedMap.set(ct.id, ct);
          return Array.from(mergedMap.values()).sort((a, b) => b.timestamp - a.timestamp);
        });
      }
    });
    return () => {
      unsubAcc();
      unsubTx();
    };
  }, [authUser, authVersion]);

  const showSnackbar = useCallback(
    (message: string, actionLabel?: string, onAction?: () => void) => {
      const id = Date.now();
      setSnackbar({ id, message, actionLabel, onAction });
      window.setTimeout(() => {
        setSnackbar((curr) => (curr?.id === id ? null : curr));
      }, 4200);
    },
    []
  );

  const dismissSnackbar = useCallback(() => setSnackbar(null), []);

  const enterGuestMode = useCallback(() => {
    setGuestMode(true);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const user = await signInWithGooglePopup();
    setGuestMode(false);
    if (user && user.emailVerified) {
      try {
        await syncLocalDataToCloud(user.uid, accountsRef.current, transactionsRef.current);
      } catch {
        // non-fatal initial sync
      }
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const user = await signInWithEmailPassword(email, password);
    setGuestMode(false);
    setAuthVersion((v) => v + 1);
    if (user && user.emailVerified) {
      try {
        await syncLocalDataToCloud(user.uid, accountsRef.current, transactionsRef.current);
      } catch {
        // non-fatal initial sync
      }
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    await registerWithEmailPassword(email, password);
    setGuestMode(false);
    setAuthVersion((v) => v + 1);
  }, []);

  const sendVerificationEmail = useCallback(async () => {
    await resendVerificationEmail();
  }, []);

  const sendResetPasswordEmail = useCallback(async (email: string) => {
    await sendPasswordReset(email);
  }, []);

  const refreshAuthSession = useCallback(async (): Promise<boolean> => {
    const updated = await reloadCurrentUser();
    setAuthUser(updated);
    setAuthVersion((v) => v + 1);
    if (updated && updated.emailVerified) {
      try {
        await syncLocalDataToCloud(updated.uid, accountsRef.current, transactionsRef.current);
      } catch {
        // non-fatal initial sync
      }
      return true;
    }
    return false;
  }, []);

  const signOutUser = useCallback(async () => {
    await signOutGoogle();
    setGuestMode(false);
    setSubScreenStack([]);
  }, []);

  const unlockApp = useCallback(
    (pin: string) => {
      if (!extendedSettings.screenLockPin || pin === extendedSettings.screenLockPin) {
        setIsLocked(false);
        return true;
      }
      return false;
    },
    [extendedSettings.screenLockPin]
  );

  // Navigation helpers
  const navigateToTab = useCallback((tab: PrimaryTab) => {
    setActiveTab(tab);
    setSubScreenStack([]);
  }, []);

  const openSubScreen = useCallback((screen: SubScreen, params?: Record<string, string>) => {
    setSubScreenStack((prev) => [...prev, { screen, params }]);
  }, []);

  const closeSubScreen = useCallback(() => {
    setSubScreenStack((prev) => prev.slice(0, -1));
  }, []);

  const replaceSubScreen = useCallback((screen: SubScreen, params?: Record<string, string>) => {
    setSubScreenStack((prev) => [...prev.slice(0, -1), { screen, params }]);
  }, []);

  const popToRoot = useCallback(() => {
    setSubScreenStack([]);
  }, []);

  const openAddTransaction = useCallback((params: AddTransactionParams = {}) => {
    setTxLaunchParams(params);
    setSubScreenStack((prev) => [...prev, { screen: 'ADD_TRANSACTION' }]);
  }, []);

  // Settings
  const updateSettings = useCallback((partial: Partial<AppSettingsEntity>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const updateExtendedSettings = useCallback((partial: Partial<ExtendedSettingsState>) => {
    setExtendedSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const updateHomeCustomization = useCallback((partial: Partial<HomeCustomization>) => {
    setHomeCustomization((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetHomeCustomization = useCallback(() => {
    setHomeCustomization(DEFAULT_HOME_CUSTOMIZATION);
  }, []);

  // Accounts
  const addAccount = useCallback(
    (input: Omit<AccountEntity, 'id' | 'sortOrder'> & { id?: string }): AccountEntity => {
      const next: AccountEntity = {
        ...input,
        id: input.id || `acc_${crypto.randomUUID().slice(0, 10)}`,
        sortOrder: accountsRef.current.length,
      };
      setAccounts((prev) => [...prev, next]);
      if (authUser?.emailVerified) {
        void saveCloudAccount(authUser.uid, next).catch(() => undefined);
      }
      return next;
    },
    [authUser]
  );

  const updateAccount = useCallback(
    (account: AccountEntity) => {
      setAccounts((prev) => prev.map((a) => (a.id === account.id ? account : a)));
      if (authUser?.emailVerified) {
        void saveCloudAccount(authUser.uid, account).catch(() => undefined);
      }
    },
    [authUser]
  );

  const deleteAccount = useCallback(
    (accountId: string) => {
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      setTransactions((prev) =>
        prev.filter((t) => t.accountId !== accountId && t.toAccountId !== accountId)
      );
      if (authUser?.emailVerified) {
        void deleteCloudAccount(authUser.uid, accountId).catch(() => undefined);
      }
    },
    [authUser]
  );

  const toggleArchiveAccount = useCallback(
    (accountId: string) => {
      setAccounts((prev) =>
        prev.map((a) => {
          if (a.id !== accountId) return a;
          const updated = { ...a, isHidden: !a.isHidden };
          if (authUser?.emailVerified) void saveCloudAccount(authUser.uid, updated).catch(() => undefined);
          return updated;
        })
      );
    },
    [authUser]
  );

  const adjustAccountBalance = useCallback(
    (accountId: string, newBalance: number, createAdjustmentTx = false) => {
      const target = accountsRef.current.find((a) => a.id === accountId);
      if (!target) return;
      const diff = newBalance - target.balance;
      const updated = { ...target, balance: newBalance };
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? updated : a)));
      if (authUser?.emailVerified) void saveCloudAccount(authUser.uid, updated).catch(() => undefined);

      if (createAdjustmentTx && Math.abs(diff) > 0.009) {
        const tx: TransactionEntity = {
          id: `tx_adj_${crypto.randomUUID().slice(0, 8)}`,
          type: diff >= 0 ? 'INCOME' : 'EXPENSE',
          amount: Math.abs(diff),
          title: 'Balance Reconciliation',
          category: 'Adjustment',
          subcategory: '',
          accountId,
          toAccountId: null,
          timestamp: Date.now(),
          notes: 'Manual balance adjustment',
          isRecurring: false,
          payeeOrPayer: '',
          debtId: null,
        };
        setTransactions((prev) => [tx, ...prev]);
        if (authUser?.emailVerified) void saveCloudTransaction(authUser.uid, tx).catch(() => undefined);
      }
    },
    [authUser]
  );

  const reorderAccounts = useCallback(
    (orderedIds: string[]) => {
      setAccounts((prev) => {
        const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
        return prev
          .map((a) => ({
            ...a,
            sortOrder: orderMap.has(a.id) ? orderMap.get(a.id)! : a.sortOrder + orderedIds.length,
          }))
          .sort((a, b) => a.sortOrder - b.sortOrder);
      });
      setAccountSortOption('CUSTOM');
    },
    []
  );

  const restoreCoreCards = useCallback((): number => {
    const defaults = getDefaultFourCoreAccounts(settings.language);
    let added = 0;
    const existing = accountsRef.current;
    const existingIds = new Set(existing.map((a) => a.id));
    const missing = defaults.filter((d) => !existingIds.has(d.id));
    if (missing.length > 0) {
      added = missing.length;
      const next = [...existing, ...missing].sort((a, b) => a.sortOrder - b.sortOrder);
      setAccounts(next);
      if (authUser?.emailVerified) {
        for (const acc of missing) {
          void saveCloudAccount(authUser.uid, acc).catch(() => undefined);
        }
      }
    }
    return added;
  }, [authUser, settings.language]);

  // Transactions
  const addTransaction = useCallback(
    (input: Omit<TransactionEntity, 'id'> & { id?: string }): TransactionEntity => {
      const tx: TransactionEntity = {
        ...input,
        id: input.id || `tx_${crypto.randomUUID().slice(0, 10)}`,
      };
      setTransactions((prev) => [tx, ...prev].sort((a, b) => b.timestamp - a.timestamp));
      const nextAccs = applyBalanceEffect(accountsRef.current, tx, false);
      setAccounts(nextAccs);

      if (authUser?.emailVerified) {
        void saveCloudTransaction(authUser.uid, tx).catch(() => undefined);
        for (const acc of nextAccs) {
          if (acc.id === tx.accountId || acc.id === tx.toAccountId) {
            void saveCloudAccount(authUser.uid, acc).catch(() => undefined);
          }
        }
      }
      return tx;
    },
    [authUser]
  );

  const updateTransaction = useCallback(
    (updated: TransactionEntity) => {
      const oldTx = transactionsRef.current.find((t) => t.id === updated.id);
      let nextAccs = accountsRef.current;
      if (oldTx) nextAccs = applyBalanceEffect(nextAccs, oldTx, true);
      nextAccs = applyBalanceEffect(nextAccs, updated, false);
      setAccounts(nextAccs);
      setTransactions((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)).sort((a, b) => b.timestamp - a.timestamp)
      );
      if (authUser?.emailVerified) {
        void saveCloudTransaction(authUser.uid, updated).catch(() => undefined);
        for (const acc of nextAccs) {
          if (
            acc.id === updated.accountId ||
            acc.id === updated.toAccountId ||
            acc.id === oldTx?.accountId ||
            acc.id === oldTx?.toAccountId
          ) {
            void saveCloudAccount(authUser.uid, acc).catch(() => undefined);
          }
        }
      }
    },
    [authUser]
  );

  const deleteTransaction = useCallback(
    (txId: string) => {
      const target = transactionsRef.current.find((t) => t.id === txId);
      if (!target) return;
      const nextAccs = applyBalanceEffect(accountsRef.current, target, true);
      setAccounts(nextAccs);
      setTransactions((prev) => prev.filter((t) => t.id !== txId));

      if (authUser?.emailVerified) {
        void deleteCloudTransaction(authUser.uid, txId).catch(() => undefined);
        for (const acc of nextAccs) {
          if (acc.id === target.accountId || acc.id === target.toAccountId) {
            void saveCloudAccount(authUser.uid, acc).catch(() => undefined);
          }
        }
      }

      const isBn = settings.language === 'BANGLA';
      showSnackbar(
        isBn ? 'লেনদেন মুছে ফেলা হয়েছে' : 'Transaction deleted',
        isBn ? 'পূর্বাবস্থায় ফেরান' : 'Undo',
        () => {
          setTransactions((prev) => [target, ...prev].sort((a, b) => b.timestamp - a.timestamp));
          const restoredAccs = applyBalanceEffect(accountsRef.current, target, false);
          setAccounts(restoredAccs);
          if (authUser?.emailVerified) {
            void saveCloudTransaction(authUser.uid, target).catch(() => undefined);
          }
        }
      );
    },
    [authUser, settings.language, showSnackbar]
  );

  // Categories
  const addCategory = useCallback(
    (cat: Omit<CategoryEntity, 'id' | 'sortOrder'>, initialSubs: string[] = []): CategoryEntity => {
      const id = `cat_custom_${crypto.randomUUID().slice(0, 8)}`;
      const created: CategoryEntity = {
        ...cat,
        id,
        sortOrder: categories.length + (cat.isIncome ? 1000 : cat.isTransfer ? 2000 : 0),
      };
      setCategories((prev) => [...prev, created]);
      if (initialSubs.length > 0) {
        const newSubs: SubcategoryEntity[] = initialSubs.map((name, i) => ({
          id: `${id}_sub_${Date.now()}_${i}`,
          categoryId: id,
          name: name.trim(),
          nameBn: name.trim(),
          sortOrder: i,
        }));
        setSubcategories((prev) => [...prev, ...newSubs]);
      }
      return created;
    },
    [categories.length]
  );

  const updateCategory = useCallback((cat: CategoryEntity) => {
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? cat : c)));
  }, []);

  const deleteCategory = useCallback((categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    setSubcategories((prev) => prev.filter((s) => s.categoryId !== categoryId));
  }, []);

  const reorderCategories = useCallback((orderedIds: string[]) => {
    const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
    setCategories((prev) =>
      prev.map((c) => (orderMap.has(c.id) ? { ...c, sortOrder: orderMap.get(c.id)! } : c))
    );
  }, []);

  const restoreDefaultCategories = useCallback(() => {
    const defaults = getDefaultCategories();
    setCategories((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      for (const d of defaults.categories) map.set(d.id, d);
      return Array.from(map.values());
    });
    setSubcategories((prev) => {
      const map = new Map(prev.map((s) => [s.id, s]));
      for (const s of defaults.subcategories) map.set(s.id, s);
      return Array.from(map.values());
    });
  }, []);

  const addSubcategory = useCallback((categoryId: string, name: string, nameBn = '') => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubcategories((prev) => [
      ...prev,
      {
        id: `${categoryId}_sub_${Date.now()}`,
        categoryId,
        name: trimmed,
        nameBn: nameBn.trim() || trimmed,
        sortOrder: prev.filter((s) => s.categoryId === categoryId).length,
      },
    ]);
  }, []);

  const deleteSubcategory = useCallback((subId: string) => {
    setSubcategories((prev) => prev.filter((s) => s.id !== subId));
  }, []);

  const spendingWays = useMemo(
    () =>
      extendedSettings.spendingWays && extendedSettings.spendingWays.length > 0
        ? extendedSettings.spendingWays
        : getDefaultSpendingWays(settings.language),
    [extendedSettings.spendingWays, settings.language]
  );

  const addSpendingWay = useCallback(
    (name: string): SpendingWayItem | null => {
      const clean = name.trim().slice(0, 100);
      if (!clean) return null;
      const exists = spendingWays.some((w) => w.name.toLowerCase() === clean.toLowerCase());
      if (exists) return null;
      const item: SpendingWayItem = {
        id: `way_${crypto.randomUUID().slice(0, 8)}`,
        name: clean,
      };
      setExtendedSettings((prev) => ({
        ...prev,
        spendingWays: [...(prev.spendingWays ?? spendingWays), item],
      }));
      return item;
    },
    [spendingWays]
  );

  const updateSpendingWay = useCallback(
    (id: string, name: string) => {
      const clean = name.trim().slice(0, 100);
      if (!clean) return;
      setExtendedSettings((prev) => ({
        ...prev,
        spendingWays: (prev.spendingWays ?? spendingWays).map((w) =>
          w.id === id ? { ...w, name: clean } : w
        ),
      }));
    },
    [spendingWays]
  );

  const deleteSpendingWay = useCallback(
    (id: string) => {
      setExtendedSettings((prev) => ({
        ...prev,
        spendingWays: (prev.spendingWays ?? spendingWays).filter((w) => w.id !== id),
      }));
    },
    [spendingWays]
  );

  // Budgets
  const saveBudget = useCallback((input: Omit<BudgetEntity, 'id'> & { id?: string }) => {
    setBudgets((prev) => {
      const id = input.id || `bgt_${crypto.randomUUID().slice(0, 8)}`;
      const entry: BudgetEntity = { ...input, id };
      const idx = prev.findIndex((b) => b.id === id);
      if (idx >= 0) return prev.map((b, i) => (i === idx ? entry : b));
      return [...prev, entry];
    });
  }, []);

  const deleteBudget = useCallback((budgetId: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== budgetId));
  }, []);

  // Debts
  const addDebt = useCallback(
    (input: Omit<DebtEntity, 'id'>, logWalletTx = true): DebtEntity => {
      const debt: DebtEntity = {
        ...input,
        id: `debt_${crypto.randomUUID().slice(0, 8)}`,
      };
      setDebts((prev) => [debt, ...prev]);

      if (logWalletTx && debt.accountId && debt.totalAmount > 0) {
        addTransaction({
          type: debt.type === 'LENT' ? 'LEND' : 'BORROW',
          amount: debt.totalAmount,
          title:
            debt.type === 'LENT'
              ? `Loan Lent to ${debt.personName}`
              : `Loan Borrowed from ${debt.personName}`,
          category: debt.type === 'LENT' ? 'Other Expenses' : 'Other Income',
          subcategory: debt.reason || '',
          accountId: debt.accountId,
          toAccountId: null,
          timestamp: Date.now(),
          notes: `${debt.notes} [Debt:${debt.id}]`.trim(),
          isRecurring: false,
          payeeOrPayer: debt.personName,
          debtId: debt.id,
        });
      }
      return debt;
    },
    [addTransaction]
  );

  const updateDebt = useCallback((debt: DebtEntity) => {
    setDebts((prev) => prev.map((d) => (d.id === debt.id ? debt : d)));
  }, []);

  const deleteDebt = useCallback((debtId: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== debtId));
  }, []);

  const recordDebtTransaction = useCallback(
    ({
      debtId,
      action,
      amount,
      accountId,
      notes = '',
      timestamp = Date.now(),
    }: {
      debtId: string;
      action: 'PAYMENT' | 'BORROW_MORE' | 'LEND_MORE' | 'INTEREST';
      amount: number;
      accountId: string | null;
      notes?: string;
      timestamp?: number;
    }) => {
      if (amount <= 0) return;
      const target = debts.find((d) => d.id === debtId);
      if (!target) return;

      let nextTotal = target.totalAmount;
      let nextPaid = target.paidAmount;
      if (action === 'PAYMENT') {
        nextPaid += amount;
      } else {
        nextTotal += amount;
      }
      const nextRemaining = Math.max(0, nextTotal - nextPaid);
      const nextSettled = nextRemaining <= 0.01;

      setDebts((prev) =>
        prev.map((d) =>
          d.id === debtId
            ? {
                ...d,
                totalAmount: nextTotal,
                paidAmount: nextPaid,
                amount: nextRemaining,
                isSettled: nextSettled,
              }
            : d
        )
      );

      if (accountId && action !== 'INTEREST') {
        let txType: TransactionType = 'EXPENSE';
        let title = '';
        let cat = 'Debt Repayment';
        if (action === 'PAYMENT') {
          if (target.type === 'BORROWED') {
            txType = 'EXPENSE';
            title = `Loan Repayment to ${target.personName}`;
            cat = 'Debt Repayment';
          } else {
            txType = 'INCOME';
            title = `Loan Collection from ${target.personName}`;
            cat = 'Other Income';
          }
        } else if (action === 'BORROW_MORE') {
          txType = 'BORROW';
          title = `Borrowed More from ${target.personName}`;
          cat = 'Other Income';
        } else if (action === 'LEND_MORE') {
          txType = 'LEND';
          title = `Lent More to ${target.personName}`;
          cat = 'Other Expenses';
        }
        addTransaction({
          type: txType,
          amount,
          title,
          category: cat,
          subcategory: '',
          accountId,
          toAccountId: null,
          timestamp,
          notes: `${notes} [Debt:${debtId}]`.trim(),
          isRecurring: false,
          payeeOrPayer: target.personName,
          debtId,
        });
      }
    },
    [addTransaction, debts]
  );

  const markDebtSettled = useCallback((debtId: string) => {
    setDebts((prev) =>
      prev.map((d) =>
        d.id === debtId ? { ...d, paidAmount: d.totalAmount, amount: 0, isSettled: true } : d
      )
    );
  }, []);

  // Savings goals
  const addSavingsGoal = useCallback(
    (input: Omit<SavingsGoalEntity, 'id' | 'createdAt' | 'isCompleted'>) => {
      const goal: SavingsGoalEntity = {
        ...input,
        id: `goal_${crypto.randomUUID().slice(0, 8)}`,
        createdAt: Date.now(),
        isCompleted: input.savedAmount >= input.targetAmount && input.targetAmount > 0,
      };
      setSavingsGoals((prev) => [goal, ...prev]);
    },
    []
  );

  const updateSavingsGoal = useCallback((goal: SavingsGoalEntity) => {
    setSavingsGoals((prev) =>
      prev.map((g) =>
        g.id === goal.id
          ? { ...goal, isCompleted: goal.savedAmount >= goal.targetAmount && goal.targetAmount > 0 }
          : g
      )
    );
  }, []);

  const deleteSavingsGoal = useCallback((goalId: string) => {
    setSavingsGoals((prev) => prev.filter((g) => g.id !== goalId));
  }, []);

  const contributeToGoal = useCallback(
    (goalId: string, amount: number, sourceAccountId?: string | null) => {
      if (amount <= 0) return;
      const targetGoal = savingsGoals.find((g) => g.id === goalId);
      if (!targetGoal) return;
      const updatedSaved = targetGoal.savedAmount + amount;
      setSavingsGoals((prev) =>
        prev.map((g) =>
          g.id === goalId
            ? {
                ...g,
                savedAmount: updatedSaved,
                isCompleted: updatedSaved >= g.targetAmount && g.targetAmount > 0,
              }
            : g
        )
      );
      if (sourceAccountId) {
        addTransaction({
          type: 'EXPENSE',
          amount,
          title: `Savings: ${targetGoal.name}`,
          category: 'Other Expenses',
          subcategory: 'Savings Goal',
          accountId: sourceAccountId,
          toAccountId: null,
          timestamp: Date.now(),
          notes: `Contribution to ${targetGoal.name} [EXCLUDE_BUDGET]`,
          isRecurring: false,
          payeeOrPayer: targetGoal.name,
          debtId: null,
        });
      }
    },
    [addTransaction, savingsGoals]
  );

  // Notifications
  const notifications = useMemo(
    () =>
      settings.notificationsEnabled
        ? generateSmartNotifications({
            accounts,
            transactions,
            budgets,
            debts,
            currencySymbol: settings.currencySymbol,
            language: settings.language,
            extendedSettings,
            readIds: readNotifIds,
          })
        : [],
    [
      accounts,
      budgets,
      debts,
      extendedSettings,
      readNotifIds,
      settings.currencySymbol,
      settings.language,
      settings.notificationsEnabled,
      transactions,
    ]
  );

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const markNotificationRead = useCallback((id: string) => {
    setReadNotifIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadNotificationIds(next);
      return next;
    });
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setReadNotifIds((prev) => {
      const next = new Set(prev);
      for (const n of notifications) next.add(n.id);
      saveReadNotificationIds(next);
      return next;
    });
  }, [notifications]);

  // Backups
  const exportJsonBackup = useCallback(
    () =>
      createBackupJson({
        settings,
        accounts,
        categories,
        subcategories,
        transactions,
        budgets,
        debts,
        savingsGoals,
      }),
    [accounts, budgets, categories, debts, savingsGoals, settings, subcategories, transactions]
  );

  const exportCsvBackup = useCallback(
    () =>
      exportToCsv({
        accounts,
        transactions,
        debts,
        currencyCode: settings.currencyCode,
      }),
    [accounts, debts, settings.currencyCode, transactions]
  );

  const exportSampleJson = useCallback(() => generateSampleJsonTemplate(), []);

  const parseBackupPreview = useCallback((rawText: string) => parseAndMigrateBackup(rawText), []);

  const applyRestoredBackup = useCallback(
    async (
      payload: NormalizedBackupPayload,
      onStage?: (stage: RestoreStage, pct: number, msg: string) => void
    ) => {
      onStage?.('CREATING_SNAPSHOT', 55, 'Preparing local state snapshot...');
      await new Promise((r) => setTimeout(r, 180));
      onStage?.('RESTORING_DATABASE', 75, 'Restoring accounts, transactions & budgets...');
      setAccounts(payload.accounts);
      setTransactions(payload.transactions);
      setCategories(payload.categories);
      setSubcategories(payload.subcategories);
      setBudgets(payload.budgets);
      setDebts(payload.debts);
      setSavingsGoals(payload.savingsGoals);
      if (payload.settings) {
        setSettings((prev) => ({ ...prev, ...payload.settings }));
      }
      onStage?.('RECONCILING_BALANCES', 92, 'Reconciling wallet balances...');
      if (authUser) {
        await syncLocalDataToCloud(authUser.uid, payload.accounts, payload.transactions);
      }
      onStage?.('COMPLETED', 100, 'Restore completed successfully!');
    },
    [authUser]
  );

  const uploadCloudBackup = useCallback(async () => {
    if (!authUser) throw new Error('Please sign in first to upload a cloud backup.');
    if (!authUser.emailVerified) {
      throw new Error('Please verify your email address first before backing up to Firebase.');
    }
    const json = exportJsonBackup();
    await syncLocalDataToCloud(authUser.uid, accounts, transactions);
    await saveCloudBackup(authUser.uid, json, {
      accountsCount: accounts.length,
      transactionsCount: transactions.length,
      categoriesCount: categories.length,
      debtsCount: debts.length,
    });
    updateExtendedSettings({ lastAutoBackupMillis: Date.now() });
  }, [accounts, authUser, categories.length, debts.length, exportJsonBackup, transactions, updateExtendedSettings]);

  const fetchCloudBackupPreview = useCallback(async () => {
    if (!authUser) throw new Error('Please sign in first to access Cloud Backups.');
    if (!authUser.emailVerified) {
      throw new Error('Please verify your email address first before accessing Cloud Backups.');
    }
    return fetchLatestCloudBackup(authUser.uid);
  }, [authUser]);

  const syncCloudNow = useCallback(async () => {
    if (!authUser) throw new Error('Sign in first.');
    if (!authUser.emailVerified) {
      throw new Error('Please verify your email address first.');
    }
    await syncLocalDataToCloud(authUser.uid, accounts, transactions);
  }, [accounts, authUser, transactions]);

  const clearAllData = useCallback(
    async (includeCloud: boolean) => {
      const defaults = getDefaultCategories();
      setAccounts([]);
      setTransactions([]);
      setBudgets([]);
      setDebts([]);
      setSavingsGoals([]);
      setCategories(defaults.categories);
      setSubcategories(defaults.subcategories);
      if (includeCloud && authUser) {
        await deleteAllCloudUserData(authUser.uid);
      }
    },
    [authUser]
  );

  const loadSampleDataset = useCallback(() => {
    const sampleJson = generateSampleJsonTemplate();
    const payload = parseAndMigrateBackup(sampleJson);
    setAccounts(payload.accounts);
    setTransactions(payload.transactions);
    setCategories(payload.categories);
    setSubcategories(payload.subcategories);
    setBudgets(payload.budgets);
    setDebts(payload.debts);
    setSavingsGoals(payload.savingsGoals);
    if (authUser) {
      void syncLocalDataToCloud(authUser.uid, payload.accounts, payload.transactions).catch(
        () => undefined
      );
    }
    showSnackbar(
      settings.language === 'BANGLA'
        ? 'নমুনা ডেটাসেট লোড হয়েছে!'
        : 'Sample dataset loaded!'
    );
  }, [authUser, settings.language, showSnackbar]);

  const currentSubScreen = subScreenStack[subScreenStack.length - 1] ?? null;

  const value: WalletContextValue = {
    authUser,
    authReady,
    guestMode,
    isLocked,
    unlockApp,
    enterGuestMode,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendVerificationEmail,
    sendResetPasswordEmail,
    refreshAuthSession,
    signOutUser,

    settings,
    extendedSettings,
    homeCustomization,
    accountSortOption,
    isDarkTheme,

    accounts,
    transactions,
    categories,
    subcategories,
    budgets,
    debts,
    savingsGoals,
    notifications,
    unreadNotificationsCount,

    activeTab,
    subScreenStack,
    currentSubScreen,
    txLaunchParams,

    snackbar,
    showSnackbar,
    dismissSnackbar,

    navigateToTab,
    openSubScreen,
    closeSubScreen,
    replaceSubScreen,
    popToRoot,
    openAddTransaction,

    updateSettings,
    updateExtendedSettings,
    updateHomeCustomization,
    resetHomeCustomization,
    setAccountSortOption,

    addAccount,
    updateAccount,
    deleteAccount,
    toggleArchiveAccount,
    adjustAccountBalance,
    reorderAccounts,
    restoreCoreCards,

    addTransaction,
    updateTransaction,
    deleteTransaction,

    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    restoreDefaultCategories,
    addSubcategory,
    deleteSubcategory,
    spendingWays,
    addSpendingWay,
    updateSpendingWay,
    deleteSpendingWay,

    saveBudget,
    deleteBudget,

    addDebt,
    updateDebt,
    deleteDebt,
    recordDebtTransaction,
    markDebtSettled,

    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    contributeToGoal,

    markNotificationRead,
    markAllNotificationsRead,

    exportJsonBackup,
    exportCsvBackup,
    exportSampleJson,
    parseBackupPreview,
    applyRestoredBackup,
    uploadCloudBackup,
    fetchCloudBackupPreview,
    syncCloudNow,
    clearAllData,
    loadSampleDataset,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
