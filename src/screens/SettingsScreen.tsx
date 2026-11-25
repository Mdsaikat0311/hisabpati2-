import React, { useMemo, useState } from 'react';
import {
  Check,
  CloudDownload,
  CloudUpload,
  CreditCard,
  Edit3,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Save,
  SunMoon,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { BANK_MFS_PRESETS, type CardCompanyPreset } from '../data/initialData';
import { COLOR_PALETTE_30 } from '../data/categoryCatalog';
import { formatCurrency, formatDayHeader, formatTime, localizeDigits } from '../utils/formatters';
import { TranslucentCard } from '../components/GlassPrimitives';
import type { AccountEntity, AccountType, AppLanguage, ThemeMode } from '../types/models';

export function SettingsScreen() {
  const {
    authUser,
    accounts,
    spendingWays,
    settings,
    extendedSettings,
    addAccount,
    updateAccount,
    deleteAccount,
    addSpendingWay,
    updateSpendingWay,
    deleteSpendingWay,
    updateSettings,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendVerificationEmail,
    sendResetPasswordEmail,
    refreshAuthSession,
    signOutUser,
    uploadCloudBackup,
    fetchCloudBackupPreview,
    parseBackupPreview,
    applyRestoredBackup,
    showSnackbar,
  } = useWallet();

  const isBn = settings.language === 'BANGLA';

  const visibleAccounts = useMemo(
    () => accounts.filter((a) => !a.isHidden).sort((a, b) => a.sortOrder - b.sortOrder),
    [accounts]
  );

  // Add new card state
  const [newCardName, setNewCardName] = useState('');
  const [newCardCompany, setNewCardCompany] = useState('');
  const [newCardType, setNewCardType] = useState<AccountType>('BANK');
  const [newCardBalance, setNewCardBalance] = useState('');
  const [newCardColor, setNewCardColor] = useState('#047857');

  // Edit existing card modal state
  const [editingCard, setEditingCard] = useState<AccountEntity | null>(null);
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [editColor, setEditColor] = useState('#0284C7');

  // Add / edit spending way state
  const [newWayName, setNewWayName] = useState('');
  const [editingWayId, setEditingWayId] = useState<string | null>(null);
  const [editingWayText, setEditingWayText] = useState('');

  // Firebase Email/Password auth & cloud backup state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailAuthMode, setEmailAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState<'BACKUP' | 'RESTORE' | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const formatFirebaseAuthError = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err);
    if (raw.includes('auth/operation-not-allowed')) {
      return isBn
        ? 'ফায়ারবেস কনসোলে Email/Password সাইন-ইন চালু করা নেই। Authentication > Sign-in method থেকে এটি Enable করুন।'
        : 'Email/Password sign-in is not enabled in Firebase Console (Authentication > Sign-in method).';
    }
    if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password')) {
      return isBn ? 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।' : 'Invalid email or password.';
    }
    if (raw.includes('auth/user-not-found')) {
      return isBn ? 'এই ইমেইলে কোনো একাউন্ট পাওয়া যায়নি।' : 'No account found with this email.';
    }
    if (raw.includes('auth/email-already-in-use')) {
      return isBn ? 'এই ইমেইল দিয়ে আগেই একাউন্ট খোলা হয়েছে। লগইন করুন।' : 'Email is already registered. Please sign in.';
    }
    if (raw.includes('auth/weak-password')) {
      return isBn ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' : 'Password must be at least 6 characters.';
    }
    if (raw.includes('auth/invalid-email')) {
      return isBn ? 'সঠিক ইমেইল ঠিকানা লিখুন।' : 'Please enter a valid email address.';
    }
    return raw;
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const cleanEmail = authEmail.trim();
    if (!cleanEmail || !authPassword) {
      setAuthError(isBn ? 'ইমেইল ও পাসওয়ার্ড লিখুন।' : 'Enter both email and password.');
      return;
    }
    setAuthBusy(true);
    try {
      if (emailAuthMode === 'REGISTER') {
        await signUpWithEmail(cleanEmail, authPassword);
        showSnackbar(
          isBn
            ? 'একাউন্ট তৈরি হয়েছে! জিমেইল ইনবক্স থেকে ভেরিফিকেশন লিঙ্কে ক্লিক করুন।'
            : 'Account created! Please verify via the link sent to your email.'
        );
      } else {
        await signInWithEmail(cleanEmail, authPassword);
        showSnackbar(isBn ? 'সফলভাবে লগইন হয়েছে' : 'Signed in successfully');
      }
      setAuthPassword('');
      setShowEmailForm(false);
    } catch (err) {
      setAuthError(formatFirebaseAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleResetPassword = async () => {
    setAuthError(null);
    const cleanEmail = authEmail.trim();
    if (!cleanEmail) {
      setAuthError(isBn ? 'আগে আপনার জিমেইল ঠিকানা লিখুন।' : 'Enter your email address first.');
      return;
    }
    setAuthBusy(true);
    try {
      await sendResetPasswordEmail(cleanEmail);
      showSnackbar(
        isBn
          ? `${cleanEmail}-এ পাসওয়ার্ড রিসেট লিঙ্ক পাঠানো হয়েছে`
          : `Password reset link sent to ${cleanEmail}`
      );
    } catch (err) {
      setAuthError(formatFirebaseAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleCloudBackupNow = async () => {
    setBackupBusy('BACKUP');
    try {
      await uploadCloudBackup();
      showSnackbar(
        isBn ? 'আপনার সব হিসাব ফায়ারবেসে ব্যাকআপ রাখা হয়েছে!' : 'All data backed up to Firebase!'
      );
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setBackupBusy(null);
    }
  };

  const handleCloudRestoreNow = async () => {
    setBackupBusy('RESTORE');
    try {
      const latest = await fetchCloudBackupPreview();
      if (!latest) {
        showSnackbar(
          isBn ? 'ফায়ারবেসে কোনো পুরনো ব্যাকআপ পাওয়া যায়নি।' : 'No cloud backup found in Firebase.'
        );
        return;
      }
      const payload = parseBackupPreview(latest.jsonString);
      await applyRestoredBackup(payload);
      showSnackbar(
        isBn
          ? `ফায়ারবেস থেকে ${localizeDigits(payload.transactions.length, settings.language)}টি হিসাব রিস্টোর হয়েছে!`
          : `Restored ${payload.transactions.length} transactions from Firebase!`
      );
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setBackupBusy(null);
    }
  };

  const handleSelectCompanyPreset = (preset: CardCompanyPreset) => {
    setNewCardName(isBn ? preset.nameBn : preset.name);
    setNewCardCompany(preset.institution);
    setNewCardType(preset.type);
    setNewCardColor(preset.colorHex);
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCardName.trim().slice(0, 100);
    if (!cleanName) {
      showSnackbar(isBn ? 'কার্ড বা অ্যাকাউন্টের নাম লিখুন' : 'Enter card or account name');
      return;
    }
    const parsedBal = parseFloat(newCardBalance);
    const initialBal = Number.isFinite(parsedBal) ? parsedBal : 0;

    addAccount({
      name: cleanName,
      type: newCardType,
      institution: newCardCompany.trim().slice(0, 100) || cleanName,
      balance: initialBal,
      openingBalance: initialBal,
      accountNumberLast4: '',
      colorHex: newCardColor,
      iconName: newCardType === 'MFS' ? 'mfs' : newCardType === 'CASH' ? 'cash' : 'bank',
      isHidden: false,
      creditLimit: 0,
      billingDate: '',
      paymentDueDate: '',
      minPayment: 0,
      notes: '',
      includeInTotal: true,
    });

    setNewCardName('');
    setNewCardCompany('');
    setNewCardBalance('');
    showSnackbar(isBn ? `${cleanName} যোগ করা হয়েছে` : `${cleanName} added`);
  };

  const openCardEditor = (acc: AccountEntity) => {
    setEditingCard(acc);
    setEditName(acc.name);
    setEditCompany(acc.institution);
    setEditBalance(String(acc.balance));
    setEditColor(acc.colorHex || '#0284C7');
  };

  const handleSaveCardEdit = () => {
    if (!editingCard) return;
    const cleanName = editName.trim().slice(0, 100) || editingCard.name;
    const parsedBal = parseFloat(editBalance);
    const nextBal = Number.isFinite(parsedBal) ? parsedBal : editingCard.balance;

    updateAccount({
      ...editingCard,
      name: cleanName,
      institution: editCompany.trim().slice(0, 100) || cleanName,
      balance: nextBal,
      colorHex: editColor,
    });

    setEditingCard(null);
    showSnackbar(isBn ? `${cleanName} আপডেট হয়েছে` : `${cleanName} updated`);
  };

  const handleAddWay = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newWayName.trim();
    if (!clean) return;
    const created = addSpendingWay(clean);
    if (!created) {
      showSnackbar(isBn ? 'এই খাতটি আগে থেকেই আছে' : 'This way already exists');
      return;
    }
    setNewWayName('');
    showSnackbar(isBn ? `"${created.name}" খাত যোগ হয়েছে` : `Added "${created.name}"`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pt-5 pb-28 space-y-6">
      <header>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
          {isBn ? 'সেটিংস' : 'Settings'}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {isBn
            ? 'আপনার ব্যাংক/কার্ড অ্যাকাউন্ট এবং টাকা খরচের খাতগুলো এখানে যুক্ত করুন'
            : 'Manage your bank/wallet cards and spending ways'}
        </p>
      </header>

      {/* SECTION 1: CARDS, BANKS & BALANCE ACCOUNTS */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard size={17} className="text-sky-600" />
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
            {isBn ? '১. কার্ড, ব্যাংক ও ব্যালেন্স অপশন' : '1. Cards, Banks & Balance Accounts'}
          </h2>
        </div>

        {/* Add New Card Form with Company Presets */}
        <TranslucentCard className="p-4 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {isBn
                ? 'ব্যাংক / কোম্পানির অপশন থেকে বেছে নিন (অথবা নিচে কাস্টম নাম লিখুন):'
                : 'Choose a bank/provider preset (or type custom below):'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {BANK_MFS_PRESETS.map((preset) => {
                const label = isBn ? preset.nameBn : preset.name;
                const active =
                  newCardName.trim().toLowerCase() === label.toLowerCase() &&
                  newCardCompany.trim().toLowerCase() === preset.institution.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectCompanyPreset(preset)}
                    className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                      active
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleAddCard} className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-white/10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  {isBn ? 'কার্ড / অ্যাকাউন্টের নাম' : 'Card / Account Name'}
                </label>
                <input
                  type="text"
                  value={newCardName}
                  maxLength={100}
                  onChange={(e) => setNewCardName(e.target.value)}
                  placeholder={isBn ? 'যেমন: ইসলামী ব্যাংক' : 'e.g. Islami Bank'}
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  {isBn ? 'ব্যাংক / কোম্পানি (ঐচ্ছিক)' : 'Bank / Provider'}
                </label>
                <input
                  type="text"
                  value={newCardCompany}
                  maxLength={100}
                  onChange={(e) => setNewCardCompany(e.target.value)}
                  placeholder={isBn ? 'যেমন: Islami Bank PLC' : 'e.g. bKash / DBBL'}
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  {isBn ? 'শুরুর / বর্তমান ব্যালেন্স' : 'Current Balance'}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={newCardBalance}
                  onChange={(e) => setNewCardBalance(e.target.value)}
                  placeholder="0"
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-mono-num font-bold text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {COLOR_PALETTE_30.slice(0, 8).map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setNewCardColor(hex)}
                    aria-label={hex}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: hex,
                      borderColor: newCardColor === hex ? '#fff' : 'transparent',
                    }}
                  >
                    {newCardColor === hex && <Check size={12} />}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="min-h-[42px] px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold flex items-center gap-1.5"
              >
                <Plus size={15} />
                <span>{isBn ? 'কার্ড যোগ করুন' : 'Add Card'}</span>
              </button>
            </div>
          </form>
        </TranslucentCard>

        {/* Active Cards List */}
        <TranslucentCard className="divide-y divide-slate-200/60 dark:divide-white/10">
          {visibleAccounts.length === 0 ? (
            <p className="p-5 text-center text-xs text-slate-500">
              {isBn ? 'এখনো কোনো কার্ড নেই' : 'No cards configured'}
            </p>
          ) : (
            visibleAccounts.map((acc) => (
              <div
                key={acc.id}
                className="p-3.5 sm:p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-4 h-10 rounded-lg shrink-0"
                    style={{ backgroundColor: acc.colorHex }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                      {acc.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {acc.institution && acc.institution !== acc.name
                        ? `${acc.institution} · `
                        : ''}
                      <span className="font-mono-num font-bold text-slate-700 dark:text-slate-200">
                        {formatCurrency(acc.balance, settings.currencySymbol, settings.language)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openCardEditor(acc)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                  >
                    <Edit3 size={13} />
                    <span>{isBn ? 'এডিট' : 'Edit'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteAccount(acc.id);
                      showSnackbar(isBn ? `${acc.name} মুছে ফেলা হয়েছে` : `${acc.name} removed`);
                    }}
                    aria-label={isBn ? 'মুছুন' : 'Delete'}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-500/10"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </TranslucentCard>
      </section>

      {/* SECTION 2: WAYS OF SPENDING / INCOME (SUBCATEGORIES) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag size={17} className="text-sky-600" />
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
            {isBn
              ? '২. টাকা খরচ ও আয়ের খাত (সাব-ক্যাটাগরি)'
              : '2. Spending & Income Ways (Subcategories)'}
          </h2>
        </div>

        <TranslucentCard className="p-4 space-y-4">
          <form onSubmit={handleAddWay} className="flex gap-2">
            <input
              type="text"
              value={newWayName}
              maxLength={100}
              onChange={(e) => setNewWayName(e.target.value)}
              placeholder={
                isBn
                  ? 'নতুন খাত লিখুন (যেমন: নিজের বাড়ি, দোকান, গাড়ি)...'
                  : 'Add new way (e.g. Own Home, Shop, Car)...'
              }
              className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none"
            />
            <button
              type="submit"
              className="min-h-[44px] px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold flex items-center gap-1.5 shrink-0"
            >
              <Plus size={15} />
              <span>{isBn ? 'যোগ করুন' : 'Add'}</span>
            </button>
          </form>

          <div className="divide-y divide-slate-200/60 dark:divide-white/10">
            {spendingWays.map((way, idx) => {
              const isEditing = editingWayId === way.id;
              return (
                <div
                  key={way.id}
                  className="py-2.5 flex items-center justify-between gap-2 min-h-[48px]"
                >
                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingWayText}
                        maxLength={100}
                        onChange={(e) => setEditingWayText(e.target.value)}
                        className="flex-1 min-h-[38px] rounded-xl border border-sky-500 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-sm font-semibold outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          updateSpendingWay(way.id, editingWayText);
                          setEditingWayId(null);
                        }}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-bold"
                      >
                        {isBn ? 'সেভ' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingWayId(null)}
                        className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                        {localizeDigits(idx + 1, settings.language)}. {way.name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingWayId(way.id);
                            setEditingWayText(way.name);
                          }}
                          aria-label={isBn ? 'নাম পরিবর্তন' : 'Rename'}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSpendingWay(way.id)}
                          aria-label={isBn ? 'মুছুন' : 'Delete'}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-500/10"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </TranslucentCard>
      </section>

      {/* SECTION 3: COMPACT APP & CLOUD PREFERENCES */}
      <section className="space-y-3">
        <h2 className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
          {isBn ? 'ভাষা, থিম ও ক্লাউড সিঙ্ক' : 'Language, Theme & Cloud Sync'}
        </h2>

        <TranslucentCard className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              <Globe size={15} className="text-sky-600" />
              <span>{isBn ? 'ভাষা' : 'Language'}</span>
            </div>
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5">
              {(
                [
                  ['BANGLA', 'বাংলা'],
                  ['ENGLISH', 'English'],
                ] as Array<[AppLanguage, string]>
              ).map(([langId, label]) => (
                <button
                  key={langId}
                  type="button"
                  onClick={() => updateSettings({ language: langId })}
                  className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold transition ${
                    settings.language === langId
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              <SunMoon size={15} className="text-sky-600" />
              <span>{isBn ? 'থিম' : 'Theme'}</span>
            </div>
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5">
              {(
                [
                  ['AUTO', isBn ? 'অটো' : 'Auto'],
                  ['LIGHT', isBn ? 'লাইট' : 'Light'],
                  ['DARK', isBn ? 'ডার্ক' : 'Dark'],
                ] as Array<[ThemeMode, string]>
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateSettings({ themeMode: mode })}
                  className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold transition ${
                    settings.themeMode === mode
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {authUser
                    ? authUser.displayName || authUser.email
                    : isBn
                    ? 'ফায়ারবেস ক্লাউড ব্যাকআপ (অফলাইন মোড)'
                    : 'Firebase Cloud Backup (Offline)'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {authUser
                    ? `${authUser.email || ''}${
                        authUser.emailVerified
                          ? isBn
                            ? ' · ভেরিফায়েড'
                            : ' · Verified'
                          : isBn
                          ? ' · ভেরিফিকেশন বাকি'
                          : ' · Unverified'
                      }`
                    : isBn
                    ? 'জিমেইল বা পাসওয়ার্ড দিয়ে লগইন করলে অটো ব্যাকআপ থাকবে'
                    : 'Sign in with Google or Email/Password for cloud backup'}
                </p>
              </div>

              {authUser ? (
                <button
                  type="button"
                  onClick={() => void signOutUser()}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 shrink-0"
                >
                  <LogOut size={14} /> {isBn ? 'সাইন আউট' : 'Sign Out'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={() => {
                    setAuthError(null);
                    setAuthBusy(true);
                    void signInWithGoogle()
                      .then(() => {
                        showSnackbar(isBn ? 'গুগল দিয়ে সাইন-ইন সম্পন্ন হয়েছে' : 'Signed in with Google');
                      })
                      .catch((e) => setAuthError(formatFirebaseAuthError(e)))
                      .finally(() => setAuthBusy(false));
                  }}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 disabled:opacity-60"
                >
                  {authBusy ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                  <span>{isBn ? 'গুগল সাইন-ইন' : 'Google Sign In'}</span>
                </button>
              )}
            </div>

            {!authUser && (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null);
                    setShowEmailForm((v) => !v);
                  }}
                  className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition"
                >
                  <Mail size={14} className="text-sky-600" />
                  <span>
                    {showEmailForm
                      ? isBn
                        ? 'ইমেইল ও পাসওয়ার্ড ফর্ম লুকান'
                        : 'Hide Email & Password Form'
                      : isBn
                      ? 'জিমেইল ও পাসওয়ার্ড দিয়ে লগইন / একাউন্ট খুলুন'
                      : 'Sign In / Register with Email & Password'}
                  </span>
                </button>

                {showEmailForm && (
                  <form
                    onSubmit={handleEmailAuthSubmit}
                    className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 p-3.5 space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900/70">
                      <button
                        type="button"
                        onClick={() => {
                          setEmailAuthMode('LOGIN');
                          setAuthError(null);
                        }}
                        className={`min-h-[34px] rounded-lg text-xs font-bold transition ${
                          emailAuthMode === 'LOGIN'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {isBn ? 'লগইন করুন' : 'Sign In'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailAuthMode('REGISTER');
                          setAuthError(null);
                        }}
                        className={`min-h-[34px] rounded-lg text-xs font-bold transition ${
                          emailAuthMode === 'REGISTER'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {isBn ? 'নতুন একাউন্ট' : 'Create Account'}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder={isBn ? 'আপনার জিমেইল লিখুন (name@gmail.com)' : 'Email address'}
                        className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                      />
                      <div className="relative flex items-center">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          placeholder={isBn ? 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)' : 'Password (min 6 chars)'}
                          className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 pl-3 pr-10 py-2 text-sm text-slate-900 dark:text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {authError && (
                      <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                        {authError}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        disabled={authBusy}
                        onClick={() => void handleResetPassword()}
                        className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline py-1"
                      >
                        {isBn ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
                      </button>

                      <button
                        type="submit"
                        disabled={authBusy}
                        className="min-h-[40px] px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold flex items-center gap-1.5 disabled:opacity-60"
                      >
                        {authBusy ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <KeyRound size={14} />
                        )}
                        <span>
                          {emailAuthMode === 'REGISTER'
                            ? isBn
                              ? 'একাউন্ট খুলুন'
                              : 'Create Account'
                            : isBn
                            ? 'লগইন করুন'
                            : 'Sign In'}
                        </span>
                      </button>
                    </div>
                  </form>
                )}

                {authError && !showEmailForm && (
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                    {authError}
                  </p>
                )}
              </div>
            )}

            {authUser && !authUser.emailVerified && (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3 space-y-2.5">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  {isBn
                    ? 'ব্যাকআপ চালু করতে আপনার জিমেইল ইনবক্সে পাঠানো ভেরিফিকেশন লিঙ্কে ক্লিক করুন, তারপর নিচের বাটনে চাপ দিন।'
                    : 'Click the verification link sent to your email inbox, then tap Refresh below to enable Firebase backup.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={authBusy}
                    onClick={() => {
                      setAuthBusy(true);
                      void refreshAuthSession()
                        .then((ok) =>
                          showSnackbar(
                            ok
                              ? isBn
                                ? 'ইমেইল ভেরিফায়েড! এখন ফায়ারবেস ব্যাকআপ চালু হয়েছে।'
                                : 'Email verified! Firebase backup is now active.'
                              : isBn
                              ? 'এখনো ভেরিফাই হয়নি — জিমেইল ইনবক্স/স্প্যাম চেক করুন।'
                              : 'Not verified yet — please check your inbox or spam folder.'
                          )
                        )
                        .finally(() => setAuthBusy(false));
                    }}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <RefreshCw size={13} />
                    <span>{isBn ? 'ভেরিফাই চেক করুন' : 'Refresh Status'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={authBusy}
                    onClick={() => {
                      setAuthBusy(true);
                      void sendVerificationEmail()
                        .then(() =>
                          showSnackbar(
                            isBn ? 'নতুন ভেরিফিকেশন লিঙ্ক পাঠানো হয়েছে' : 'Verification link resent'
                          )
                        )
                        .catch((e) => showSnackbar(formatFirebaseAuthError(e)))
                        .finally(() => setAuthBusy(false));
                    }}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold"
                  >
                    {isBn ? 'আবার লিঙ্ক পাঠান' : 'Resend Email'}
                  </button>
                </div>
              </div>
            )}

            {authUser && authUser.emailVerified && (
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {isBn ? 'ফায়ারবেস ব্যাকআপ সংযুক্ত আছে' : 'Connected to Firebase Backup'}
                  </span>
                  {extendedSettings.lastAutoBackupMillis > 0 && (
                    <span className="font-mono-num truncate">
                      {isBn ? 'সর্বশেষ: ' : 'Last: '}
                      {formatDayHeader(extendedSettings.lastAutoBackupMillis, settings.language)},{' '}
                      {formatTime(extendedSettings.lastAutoBackupMillis, settings.language)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={backupBusy !== null}
                    onClick={() => void handleCloudBackupNow()}
                    className="min-h-[40px] px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {backupBusy === 'BACKUP' ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CloudUpload size={14} />
                    )}
                    <span>{isBn ? 'ব্যাকআপ রাখুন' : 'Backup Now'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={backupBusy !== null}
                    onClick={() => void handleCloudRestoreNow()}
                    className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300/80 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {backupBusy === 'RESTORE' ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CloudDownload size={14} />
                    )}
                    <span>{isBn ? 'রিস্টোর করুন' : 'Restore'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </TranslucentCard>
      </section>

      {/* Edit Card Modal */}
      {editingCard && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isBn ? 'কার্ড ও ব্যালেন্স পরিবর্তন' : 'Edit Card & Balance'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  {isBn ? 'বর্তমান ব্যালেন্স' : 'Current Balance'}
                </label>
                <div className="flex items-baseline gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-3.5 py-2.5">
                  <span className="text-xl font-black text-slate-400">
                    {settings.currencySymbol}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={editBalance}
                    onChange={(e) => setEditBalance(e.target.value)}
                    className="w-full bg-transparent text-2xl font-black font-mono-num text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  {isBn ? 'কার্ডের নাম' : 'Card Name'}
                </label>
                <input
                  type="text"
                  value={editName}
                  maxLength={100}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  {isBn ? 'ব্যাংক / কোম্পানি' : 'Bank / Provider'}
                </label>
                <input
                  type="text"
                  value={editCompany}
                  maxLength={100}
                  onChange={(e) => setEditCompany(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                  {isBn ? 'কার্ডের রঙ' : 'Card Color'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE_30.slice(0, 10).map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setEditColor(hex)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white border-2"
                      style={{
                        backgroundColor: hex,
                        borderColor: editColor === hex ? '#fff' : 'transparent',
                      }}
                    >
                      {editColor === hex && <Check size={12} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveCardEdit}
              className="w-full min-h-[46px] py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-extrabold flex items-center justify-center gap-1.5"
            >
              <Save size={15} /> {isBn ? 'সংরক্ষণ করুন' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
