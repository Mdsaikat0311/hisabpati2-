import React, { useState } from 'react';
import {
  User,
  Palette,
  LayoutGrid,
  Coins,
  HardDriveUpload,
  BellRing,
  Lock,
  Calculator,
  Info,
  LogIn,
  LogOut,
  ChevronRight,
  X,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import { SubScreenHeader, TranslucentCard } from '../components/GlassPrimitives';

export function SettingsScreen() {
  const {
    authUser,
    settings,
    extendedSettings,
    updateSettings,
    updateExtendedSettings,
    signInWithGoogle,
    signOutUser,
    openSubScreen,
    closeSubScreen,
    showSnackbar,
  } = useWallet();

  const isBn = settings.language === 'BANGLA';
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState(extendedSettings.screenLockPin);

  const menuRows = [
    {
      label: t('profile', settings.language),
      sub: extendedSettings.profileCustomName || settings.userName,
      icon: User,
      color: '#0284C7',
      onClick: () => openSubScreen('PROFILE'),
    },
    {
      label: `${t('theme', settings.language)} & ${t('language', settings.language)}`,
      sub: `${settings.themeMode} • ${settings.language === 'BANGLA' ? 'বাংলা' : 'English'}`,
      icon: Palette,
      color: '#7C3AED',
      onClick: () => openSubScreen('THEME'),
    },
    {
      label: t('customize_categories', settings.language),
      sub: isBn ? 'ব্যয়, আয় ও স্থানান্তর ক্যাটাগরি' : 'Expense, Income & Transfer categories',
      icon: LayoutGrid,
      color: '#10B981',
      onClick: () => openSubScreen('CATEGORIES'),
    },
    {
      label: t('currency', settings.language),
      sub: `${settings.currencyCode} (${settings.currencySymbol})`,
      icon: Coins,
      color: '#F59E0B',
      onClick: () => openSubScreen('CURRENCY_SELECTION'),
    },
    {
      label: t('backup_restore', settings.language),
      sub: isBn ? 'JSON, CSV ও ক্লাউড ব্যাকআপ' : 'JSON, CSV & Google Cloud Backup',
      icon: HardDriveUpload,
      color: '#0D9488',
      onClick: () => openSubScreen('BACKUP_RESTORE'),
    },
    {
      label: t('notifications', settings.language),
      sub: settings.notificationsEnabled
        ? isBn
          ? 'সক্রিয়'
          : 'Enabled'
        : isBn
        ? 'বন্ধ'
        : 'Muted',
      icon: BellRing,
      color: '#EC4899',
      onClick: () => openSubScreen('NOTIFICATION_MANAGER'),
    },
    {
      label: t('about_app', settings.language),
      sub: 'v2.6.0',
      icon: Info,
      color: '#64748B',
      onClick: () => openSubScreen('ABOUT'),
    },
  ];

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader title={t('settings_title', settings.language)} onBack={closeSubScreen} />

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5">
        {/* Account / Auth Card */}
        <TranslucentCard className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shrink-0"
              style={{ backgroundColor: extendedSettings.profileAvatarBgHex || '#0284C7' }}
            >
              {(authUser?.displayName || settings.userName || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {authUser ? authUser.displayName || authUser.email : isBn ? 'অফলাইন গেস্ট মোড' : 'Guest Mode (Offline)'}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {authUser
                  ? authUser.email
                  : isBn
                  ? 'ক্লাউড সিঙ্কের জন্য গুগল সাইন-ইন করুন'
                  : 'Sign in with Google for cloud backup & sync'}
              </p>
            </div>
          </div>

          {authUser ? (
            <button
              type="button"
              onClick={() => void signOutUser()}
              className="px-3 py-2 rounded-xl bg-rose-500/15 text-rose-600 text-xs font-bold flex items-center gap-1.5 shrink-0"
            >
              <LogOut size={14} /> {isBn ? 'সাইন আউট' : 'Sign Out'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                void signInWithGoogle().catch((e) =>
                  showSnackbar(e instanceof Error ? e.message : 'Sign-in failed')
                )
              }
              className="px-3 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
            >
              <LogIn size={14} /> {isBn ? 'সাইন ইন' : 'Sign In'}
            </button>
          )}
        </TranslucentCard>

        {/* Menu List */}
        <TranslucentCard className="divide-y divide-slate-200/60 dark:divide-white/10">
          {menuRows.map((row) => {
            const Icon = row.icon;
            return (
              <button
                key={row.label}
                type="button"
                onClick={row.onClick}
                className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/70 dark:hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${row.color}18`, color: row.color }}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {row.label}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{row.sub}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 shrink-0" />
              </button>
            );
          })}
        </TranslucentCard>

        {/* Toggles: PIN Lock & Auto Calculator Keypad */}
        <TranslucentCard className="divide-y divide-slate-200/60 dark:divide-white/10">
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
                <Lock size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {isBn ? 'অ্যাপ পিন লক' : 'App Passcode Lock'}
                </p>
                <p className="text-xs text-slate-500">
                  {settings.appLockEnabled
                    ? isBn
                      ? 'সক্রিয় (পিন সুরক্ষিত)'
                      : 'Active (PIN protected)'
                    : isBn
                    ? 'বন্ধ'
                    : 'Disabled'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (settings.appLockEnabled) {
                  updateSettings({ appLockEnabled: false });
                  showSnackbar(isBn ? 'অ্যাপ লক বন্ধ হয়েছে' : 'App lock disabled');
                } else {
                  setShowPinModal(true);
                }
              }}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                settings.appLockEnabled ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  settings.appLockEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/15 text-sky-500 flex items-center justify-center">
                <Calculator size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {isBn ? 'স্বয়ংক্রিয় ক্যালকুলেটর কীপ্যাড' : 'Auto-open Amount Keypad'}
                </p>
                <p className="text-xs text-slate-500">
                  {isBn
                    ? 'নতুন লেনদেন খোলার সময় কীপ্যাড দেখাবে'
                    : 'Show calculator keypad automatically on new transaction'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                updateExtendedSettings({
                  autoOpenAmountKeypad: !extendedSettings.autoOpenAmountKeypad,
                })
              }
              className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                extendedSettings.autoOpenAmountKeypad
                  ? 'bg-sky-600'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  extendedSettings.autoOpenAmountKeypad ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </TranslucentCard>
      </div>

      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {isBn ? '৪-ডিজিট পিন সেট করুন' : 'Set 4-Digit App PIN'}
              </h3>
              <button type="button" onClick={() => setShowPinModal(false)}>
                <X size={16} />
              </button>
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="1234"
              className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-3 text-center text-xl font-black tracking-[0.4em]"
            />
            <button
              type="button"
              onClick={() => {
                if (pinInput.length < 4) {
                  showSnackbar(isBn ? 'কমপক্ষে ৪ ডিজিট দিন' : 'Enter at least 4 digits');
                  return;
                }
                updateExtendedSettings({ screenLockPin: pinInput });
                updateSettings({ appLockEnabled: true });
                setShowPinModal(false);
                showSnackbar(isBn ? 'পিন লক চালু হয়েছে' : 'Passcode lock enabled');
              }}
              className="w-full py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold"
            >
              {t('save', settings.language)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
