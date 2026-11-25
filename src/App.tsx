import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { WalletProvider, useWallet } from './context/WalletContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BackgroundLayer } from './components/BackgroundLayer';
import { FloatingBottomNav } from './components/FloatingBottomNav';
import { SnackbarToast } from './components/GlassPrimitives';
import { AuthScreen } from './screens/AuthScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ReportScreen } from './screens/ReportScreen';
import { SettingsScreen } from './screens/SettingsScreen';

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
  const { authUser, authReady, guestMode, isLocked, activeTab } = useWallet();

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

  return (
    <div className="relative min-h-screen text-slate-900 dark:text-slate-100">
      <BackgroundLayer />
      <main className="relative z-10">
        {activeTab === 'HOME' && <HomeScreen />}
        {activeTab === 'REPORT' && <ReportScreen />}
        {activeTab === 'SETTINGS' && <SettingsScreen />}
        <FloatingBottomNav />
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
