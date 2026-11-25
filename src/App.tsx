import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { WalletProvider, useWallet } from './context/WalletContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BackgroundLayer } from './components/BackgroundLayer';
import { FloatingBottomNav } from './components/FloatingBottomNav';
import { SnackbarToast } from './components/GlassPrimitives';
import { AuthScreen } from './screens/AuthScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ActivityScreen } from './screens/ActivityScreen';
import { PlanScreen } from './screens/PlanScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { AccountsScreen } from './screens/AccountsScreen';
import { AccountDetailScreen } from './screens/AccountDetailScreen';
import { EditAccountScreen } from './screens/EditAccountScreen';
import { AdjustBalanceScreen } from './screens/AdjustBalanceScreen';
import { AddTransactionScreen } from './screens/AddTransactionScreen';
import { BudgetDashboardScreen } from './screens/BudgetDashboardScreen';
import { AddBudgetScreen } from './screens/AddBudgetScreen';
import {
  AddDebtScreen,
  AddDebtTransactionScreen,
  DebtDetailsScreen,
  ManageDebtsScreen,
} from './screens/DebtsScreens';
import { NewSavingsGoalScreen } from './screens/NewSavingsGoalScreen';
import {
  CalendarScreen,
  CurrencyConverterScreen,
  IncomeTrackerScreen,
  MonthlyRecapScreen,
  SpendingComparisonScreen,
} from './screens/PlanToolsScreens';
import { SettingsScreen } from './screens/SettingsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ThemeScreen } from './screens/ThemeScreen';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { CurrencySelectionScreen } from './screens/CurrencySelectionScreen';
import { BackupRestoreScreen } from './screens/BackupRestoreScreen';
import {
  AboutScreen,
  NotificationManagerScreen,
  NotificationsScreen,
} from './screens/NotificationsScreens';

function PinLockGate() {
  const { unlockApp, settings } = useWallet();
  const isBn = settings.language === 'BANGLA';
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockApp(pin)) {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 relative z-20">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs glass-card rounded-3xl p-6 text-center space-y-4 shadow-2xl"
      >
        <div className="w-14 h-14 rounded-2xl bg-sky-500/15 text-sky-600 flex items-center justify-center mx-auto">
          <Lock size={26} />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            {isBn ? 'হিসাব পাতি লক করা আছে' : 'Hishab Pati Locked'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isBn ? 'আপনার পিন লিখুন' : 'Enter your passcode to unlock'}
          </p>
        </div>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => {
            setError(false);
            setPin(e.target.value.replace(/\D/g, ''));
          }}
          placeholder="••••"
          className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 px-4 py-3 text-center text-2xl font-black tracking-[0.4em] outline-none"
        />
        {error && (
          <p className="text-xs font-bold text-rose-500">
            {isBn ? 'ভুল পিন! আবার চেষ্টা করুন' : 'Incorrect passcode'}
          </p>
        )}
        <button
          type="submit"
          className="w-full py-3 rounded-2xl bg-sky-600 text-white text-sm font-extrabold"
        >
          {isBn ? 'আনলক করুন' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}

function AppShell() {
  const {
    authUser,
    authReady,
    guestMode,
    isLocked,
    activeTab,
    currentSubScreen,
  } = useWallet();

  if (isLocked) {
    return (
      <div className="relative min-h-screen">
        <BackgroundLayer />
        <PinLockGate />
      </div>
    );
  }

  if (!authReady && !guestMode) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <BackgroundLayer />
        <img
          src="/assets/ic_app_logo.png"
          alt="Hishab Pati"
          className="w-16 h-16 rounded-2xl animate-pulse object-contain"
        />
      </div>
    );
  }

  if (!authUser && !guestMode) {
    return <AuthScreen />;
  }

  const renderSubScreen = () => {
    if (!currentSubScreen) return null;
    const params = currentSubScreen.params ?? {};
    switch (currentSubScreen.screen) {
      case 'ACCOUNTS':
        return <AccountsScreen />;
      case 'ACCOUNT_DETAIL':
        return <AccountDetailScreen accountId={params.accountId || ''} />;
      case 'EDIT_ACCOUNT':
        return <EditAccountScreen accountId={params.accountId} />;
      case 'ADJUST_BALANCE':
        return <AdjustBalanceScreen accountId={params.accountId || ''} />;
      case 'ADD_TRANSACTION':
        return <AddTransactionScreen />;
      case 'BUDGET_DASHBOARD':
      case 'BUDGET_DETAILS':
        return <BudgetDashboardScreen />;
      case 'ADD_BUDGET':
        return (
          <AddBudgetScreen
            budgetId={params.budgetId}
            initialCategoryName={params.categoryName}
            initialOverall={params.isOverall === 'true'}
          />
        );
      case 'MANAGE_DEBTS':
        return <ManageDebtsScreen />;
      case 'DEBT_DETAILS':
        return <DebtDetailsScreen debtId={params.debtId || ''} />;
      case 'ADD_DEBT':
        return <AddDebtScreen />;
      case 'ADD_DEBT_TRANSACTION':
        return <AddDebtTransactionScreen debtId={params.debtId || ''} />;
      case 'NEW_SAVINGS_GOAL':
        return <NewSavingsGoalScreen />;
      case 'CURRENCY_CONVERTER':
        return <CurrencyConverterScreen />;
      case 'MONTHLY_RECAP':
        return <MonthlyRecapScreen />;
      case 'SPENDING_COMPARISON':
        return <SpendingComparisonScreen />;
      case 'INCOME_TRACKER':
        return <IncomeTrackerScreen />;
      case 'CALENDAR':
        return <CalendarScreen />;
      case 'SETTINGS':
        return <SettingsScreen />;
      case 'PROFILE':
        return <ProfileScreen />;
      case 'THEME':
        return <ThemeScreen />;
      case 'CATEGORIES':
        return <CategoriesScreen />;
      case 'CURRENCY_SELECTION':
        return <CurrencySelectionScreen />;
      case 'BACKUP_RESTORE':
        return <BackupRestoreScreen />;
      case 'NOTIFICATIONS':
        return <NotificationsScreen />;
      case 'NOTIFICATION_MANAGER':
        return <NotificationManagerScreen />;
      case 'ABOUT':
        return <AboutScreen />;
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen text-slate-900 dark:text-slate-100">
      <BackgroundLayer />
      <main className="relative z-10">
        {currentSubScreen ? (
          renderSubScreen()
        ) : (
          <>
            {activeTab === 'HOME' && <HomeScreen />}
            {activeTab === 'ACTIVITY' && <ActivityScreen />}
            {activeTab === 'PLAN' && <PlanScreen />}
            {activeTab === 'INSIGHTS' && <InsightsScreen />}
            <FloatingBottomNav />
          </>
        )}
      </main>
      <SnackbarToast />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <WalletProvider>
        <AppShell />
      </WalletProvider>
    </ErrorBoundary>
  );
}
