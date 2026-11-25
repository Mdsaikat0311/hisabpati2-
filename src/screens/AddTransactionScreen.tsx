import React, { useMemo, useState } from 'react';
import {
  Calculator,
  Mic,
  FileText,
  Trash2,
  ChevronRight,
  Repeat,
  Tag,
  Wallet,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import { QUICK_SUBCATEGORY_PRESETS } from '../data/initialData';
import { evaluateExpression, formatCalculatorDisplay } from '../utils/calculator';
import { formatCurrency } from '../utils/formatters';
import { SubScreenHeader, TranslucentCard } from '../components/GlassPrimitives';
import { CalculatorKeypad } from '../components/CalculatorKeypad';
import { CategorySelectionSheet } from '../components/CategorySelectionSheet';
import { WalletSelectionSheet } from '../components/WalletSelectionSheet';
import { VoiceTransactionDialog } from '../components/VoiceTransactionDialog';
import { ReceiptReviewDialog } from '../components/ReceiptReviewDialog';
import type { TransactionType } from '../types/models';

export function AddTransactionScreen() {
  const {
    txLaunchParams,
    accounts,
    categories,
    subcategories,
    settings,
    extendedSettings,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    closeSubScreen,
    openSubScreen,
    showSnackbar,
  } = useWallet();

  const isBn = settings.language === 'BANGLA';
  const editing = txLaunchParams.editingTx ?? null;

  const initialType: TransactionType =
    editing?.type ?? txLaunchParams.initialType ?? 'EXPENSE';

  const initialSub = editing?.subcategory ?? txLaunchParams.initialSubcategory ?? '';
  const inferredInitialCategory = useMemo(() => {
    if (editing?.category) return editing.category;
    if (txLaunchParams.initialCategory) return txLaunchParams.initialCategory;
    if (initialSub) {
      const matchedPreset = QUICK_SUBCATEGORY_PRESETS.find(
        (p) =>
          p.name.toLowerCase() === initialSub.trim().toLowerCase() ||
          p.nameBn === initialSub.trim()
      );
      if (matchedPreset) {
        return initialType === 'INCOME' || initialType === 'BORROW'
          ? matchedPreset.defaultIncomeCategory
          : matchedPreset.defaultExpenseCategory;
      }
    }
    if (initialType === 'INCOME' || initialType === 'BORROW') return 'Salary';
    if (initialType === 'TRANSFER') return 'Wallet Transfer';
    if (initialType === 'CC_PAYMENT') return 'Credit Card Payment';
    return 'Personal';
  }, [editing?.category, initialSub, initialType, txLaunchParams.initialCategory]);

  const [type, setType] = useState<TransactionType>(initialType);
  const [expr, setExpr] = useState<string>(
    editing
      ? String(editing.amount)
      : txLaunchParams.initialAmount
      ? String(txLaunchParams.initialAmount)
      : ''
  );
  const [title, setTitle] = useState<string>(
    editing?.title ?? txLaunchParams.initialTitle ?? ''
  );
  const [category, setCategory] = useState<string>(inferredInitialCategory);
  const [subcategory, setSubcategory] = useState<string>(initialSub);

  const visibleAccounts = useMemo(
    () => accounts.filter((a) => !a.isHidden).sort((a, b) => a.sortOrder - b.sortOrder),
    [accounts]
  );
  const defaultAccId =
    editing?.accountId ??
    txLaunchParams.preselectedAccountId ??
    extendedSettings.defaultWalletId ??
    visibleAccounts[0]?.id ??
    '';

  const [accountId, setAccountId] = useState<string>(defaultAccId);
  const [toAccountId, setToAccountId] = useState<string>(
    editing?.toAccountId ??
      txLaunchParams.preselectedToAccountId ??
      visibleAccounts.find((a) => a.id !== defaultAccId)?.id ??
      ''
  );

  const [dateTimeLocal, setDateTimeLocal] = useState<string>(() => {
    const d = new Date(editing?.timestamp ?? Date.now());
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  });
  const [payeeOrPayer, setPayeeOrPayer] = useState<string>(editing?.payeeOrPayer ?? '');
  const [notes, setNotes] = useState<string>(editing?.notes ?? '');
  const [isRecurring, setIsRecurring] = useState<boolean>(editing?.isRecurring ?? false);

  const [showKeypad, setShowKeypad] = useState<boolean>(
    !editing && extendedSettings.autoOpenAmountKeypad && txLaunchParams.initialMode === undefined
  );
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [walletPickerTarget, setWalletPickerTarget] = useState<'FROM' | 'TO' | null>(null);
  const [showVoiceModal, setShowVoiceModal] = useState(txLaunchParams.initialMode === 'voice');
  const [showReceiptModal, setShowReceiptModal] = useState(
    txLaunchParams.initialMode === 'receipt'
  );

  const evaluatedAmount = evaluateExpression(expr);
  const selectedCatMeta = categories.find(
    (c) => c.name.toLowerCase() === category.toLowerCase()
  );

  const activeCategorySubcategories = useMemo(() => {
    if (!selectedCatMeta) return [];
    return subcategories
      .filter((s) => s.categoryId === selectedCatMeta.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [selectedCatMeta, subcategories]);

  const handleTypeSwitch = (nextType: TransactionType) => {
    setType(nextType);
    if (nextType === 'INCOME' || nextType === 'BORROW') {
      const incCat = categories.find((c) => c.isIncome && !c.isTransfer);
      if (incCat) {
        setCategory(incCat.name);
      }
    } else if (nextType === 'TRANSFER' || nextType === 'CC_PAYMENT') {
      setCategory(nextType === 'CC_PAYMENT' ? 'Credit Card Payment' : 'Wallet Transfer');
      if (!toAccountId || toAccountId === accountId) {
        const alt = visibleAccounts.find((a) => a.id !== accountId);
        if (alt) setToAccountId(alt.id);
      }
    } else {
      const expCat = categories.find((c) => !c.isIncome && !c.isTransfer);
      if (expCat && (type === 'INCOME' || type === 'TRANSFER' || type === 'CC_PAYMENT')) {
        setCategory(expCat.name);
      }
    }
  };

  const handlePresetSubcategorySelect = (preset: (typeof QUICK_SUBCATEGORY_PRESETS)[number]) => {
    const label = isBn ? preset.nameBn : preset.name;
    setSubcategory(label);
    if (type === 'INCOME' || type === 'BORROW') {
      setCategory(preset.defaultIncomeCategory);
    } else if (type === 'EXPENSE' || type === 'LEND') {
      setCategory(preset.defaultExpenseCategory);
    }
  };

  const handleSave = () => {
    if (!Number.isFinite(evaluatedAmount) || evaluatedAmount <= 0) {
      showSnackbar(isBn ? 'সঠিক টাকার পরিমাণ দিন' : 'Enter a valid amount');
      return;
    }
    if (!accountId) {
      showSnackbar(isBn ? 'কার্ড বা অ্যাকাউন্ট নির্বাচন করুন' : 'Please select a card/account');
      return;
    }
    if ((type === 'TRANSFER' || type === 'CC_PAYMENT') && (!toAccountId || toAccountId === accountId)) {
      showSnackbar(isBn ? 'গন্তব্য কার্ড নির্বাচন করুন' : 'Please select a different destination card');
      return;
    }

    const parsedDate = new Date(dateTimeLocal).getTime();
    const timestamp = Number.isFinite(parsedDate) ? parsedDate : Date.now();
    const cleanSub = subcategory.trim();

    if (editing) {
      updateTransaction({
        ...editing,
        type,
        amount: evaluatedAmount,
        title: title.trim() || cleanSub || category,
        category,
        subcategory: cleanSub,
        accountId,
        toAccountId: type === 'TRANSFER' || type === 'CC_PAYMENT' ? toAccountId : null,
        timestamp,
        notes: notes.trim(),
        isRecurring,
        payeeOrPayer: payeeOrPayer.trim(),
      });
      showSnackbar(isBn ? 'লেনদেন আপডেট হয়েছে' : 'Transaction updated');
    } else {
      addTransaction({
        type,
        amount: evaluatedAmount,
        title: title.trim() || cleanSub || category,
        category,
        subcategory: cleanSub,
        accountId,
        toAccountId: type === 'TRANSFER' || type === 'CC_PAYMENT' ? toAccountId : null,
        timestamp,
        notes: notes.trim(),
        isRecurring,
        payeeOrPayer: payeeOrPayer.trim(),
        debtId: null,
      });
      showSnackbar(isBn ? 'লেনদেন সংরক্ষিত হয়েছে' : 'Transaction saved');
    }
    closeSubScreen();
  };

  const txTypes: Array<{ id: TransactionType; label: string }> = [
    { id: 'EXPENSE', label: isBn ? 'খরচ (আউট)' : 'Expense (Out)' },
    { id: 'INCOME', label: isBn ? 'আয় (ইন)' : 'Income (In)' },
    { id: 'TRANSFER', label: isBn ? 'কার্ড ট্রান্সফার' : 'Card Transfer' },
    { id: 'LEND', label: isBn ? 'ধার দিয়েছি' : 'Lent' },
    { id: 'BORROW', label: isBn ? 'ধার নিয়েছি' : 'Borrowed' },
    { id: 'CC_PAYMENT', label: isBn ? 'কার্ড বিল' : 'Card Bill' },
  ];

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader
        title={
          editing
            ? isBn
              ? 'লেনদেন সম্পাদনা'
              : 'Edit Transaction'
            : isBn
            ? 'নতুন লেনদেন'
            : 'Add Transaction'
        }
        onBack={closeSubScreen}
        rightAction={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowVoiceModal(true)}
              className="w-9 h-9 rounded-full glass-card flex items-center justify-center text-violet-600"
              aria-label={t('voice_entry', settings.language)}
            >
              <Mic size={16} />
            </button>
            <button
              type="button"
              onClick={() => setShowReceiptModal(true)}
              className="w-9 h-9 rounded-full glass-card flex items-center justify-center text-emerald-600"
              aria-label={t('scan_receipt', settings.language)}
            >
              <FileText size={16} />
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  deleteTransaction(editing.id);
                  closeSubScreen();
                }}
                className="w-9 h-9 rounded-full bg-rose-500/15 text-rose-600 flex items-center justify-center"
                aria-label={t('delete', settings.language)}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        }
      />

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Type selector */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {txTypes.map((item) => {
            const active = type === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTypeSwitch(item.id)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  active
                    ? item.id === 'INCOME' || item.id === 'BORROW'
                      ? 'bg-emerald-600 text-white'
                      : item.id === 'EXPENSE' || item.id === 'LEND'
                      ? 'bg-rose-600 text-white'
                      : 'bg-sky-600 text-white'
                    : 'glass-card text-slate-600 dark:text-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Amount Hero Display */}
        <TranslucentCard className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">
              {t('amount', settings.language)}
            </span>
            <button
              type="button"
              onClick={() => setShowKeypad((v) => !v)}
              className="text-xs font-bold text-sky-600 flex items-center gap-1"
            >
              <Calculator size={14} />
              <span>
                {showKeypad
                  ? isBn
                    ? 'কীপ্যাড লুকান'
                    : 'Hide Keypad'
                  : isBn
                  ? 'ক্যালকুলেটর'
                  : 'Keypad'}
              </span>
            </button>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-400">{settings.currencySymbol}</span>
            <input
              type="text"
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent text-4xl font-black font-mono-num text-slate-900 dark:text-white outline-none"
            />
          </div>
          {/[+\-×÷*/%]/.test(expr.slice(1)) && (
            <p className="text-xs font-mono-num text-sky-600 dark:text-sky-400 font-bold">
              = {formatCurrency(evaluatedAmount, settings.currencySymbol, settings.language)}
            </p>
          )}
        </TranslucentCard>

        {showKeypad && (
          <CalculatorKeypad
            expression={expr}
            onChange={setExpr}
            onDone={() => {
              if (expr) setExpr(formatCalculatorDisplay(evaluatedAmount));
              setShowKeypad(false);
            }}
            currencySymbol={settings.currencySymbol}
            language={settings.language}
          />
        )}

        {/* Quick Card Selector */}
        <TranslucentCard className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Wallet size={14} className="text-sky-600" />
              {type === 'TRANSFER' || type === 'CC_PAYMENT'
                ? isBn
                  ? 'কোন কার্ড থেকে বের হবে'
                  : 'From Card / Wallet'
                : type === 'INCOME' || type === 'BORROW'
                ? isBn
                  ? 'কোন কার্ডে টাকা ঢুকবে'
                  : 'Deposit Into Card'
                : isBn
                ? 'কোন কার্ড থেকে খরচ হবে'
                : 'Pay From Card'}
            </span>
            <button
              type="button"
              onClick={() => setWalletPickerTarget('FROM')}
              className="text-[11px] font-bold text-sky-600 dark:text-sky-400"
            >
              {isBn ? 'সব কার্ড / নতুন' : 'All / Add Card'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {visibleAccounts.slice(0, 6).map((acc) => {
              const selected = accountId === acc.id;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    setAccountId(acc.id);
                    if ((type === 'TRANSFER' || type === 'CC_PAYMENT') && toAccountId === acc.id) {
                      const other = visibleAccounts.find((a) => a.id !== acc.id);
                      setToAccountId(other?.id ?? '');
                    }
                  }}
                  className={`min-h-[52px] p-2.5 rounded-2xl border text-left transition flex items-center justify-between gap-2 ${
                    selected
                      ? 'border-sky-600 bg-sky-500/10 dark:bg-sky-500/20 shadow-sm'
                      : 'border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/60'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: acc.colorHex }}
                      />
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                        {acc.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono-num text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                      {formatCurrency(acc.balance, settings.currencySymbol, settings.language)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Destination Card for Transfer / CC Payment */}
          {(type === 'TRANSFER' || type === 'CC_PAYMENT') && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  {isBn ? 'কোন কার্ডে টাকা ঢুকবে' : 'Destination Card'}
                </span>
                <button
                  type="button"
                  onClick={() => setWalletPickerTarget('TO')}
                  className="text-[11px] font-bold text-sky-600 dark:text-sky-400"
                >
                  {isBn ? 'সব কার্ড' : 'More'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {visibleAccounts
                  .filter((a) => a.id !== accountId)
                  .slice(0, 6)
                  .map((acc) => {
                    const selected = toAccountId === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setToAccountId(acc.id)}
                        className={`min-h-[50px] p-2.5 rounded-2xl border text-left transition ${
                          selected
                            ? 'border-emerald-600 bg-emerald-500/10 dark:bg-emerald-500/20 shadow-sm'
                            : 'border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: acc.colorHex }}
                          />
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                            {acc.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono-num text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                          {formatCurrency(acc.balance, settings.currencySymbol, settings.language)}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </TranslucentCard>

        {/* Category & Subcategory Quick Picker + Details */}
        <TranslucentCard className="p-4 space-y-3.5">
          {/* Category Sheet Trigger */}
          <button
            type="button"
            onClick={() => setShowCategorySheet(true)}
            className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-white/10 flex items-center justify-between text-left"
          >
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">
                {t('category', settings.language)}
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {isBn && selectedCatMeta?.nameBn ? selectedCatMeta.nameBn : category}
                {subcategory ? ` • ${subcategory}` : ''}
              </span>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>

          {/* Inline Subcategory / Khath Quick Picker */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Tag size={13} className="text-sky-600" />
              <span>
                {isBn
                  ? 'সাব-ক্যাটাগরি / খাত (যেমন: পার্সোনাল, ফ্যামিলি, বিজনেস)'
                  : 'Subcategory (e.g. Personal, Family, Business)'}
              </span>
            </label>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUBCATEGORY_PRESETS.map((preset) => {
                const label = isBn ? preset.nameBn : preset.name;
                const active =
                  subcategory.trim().toLowerCase() === preset.name.toLowerCase() ||
                  subcategory.trim() === preset.nameBn;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handlePresetSubcategorySelect(preset)}
                    className={`min-h-[34px] px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      active
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}

              {activeCategorySubcategories
                .filter(
                  (sub) =>
                    !QUICK_SUBCATEGORY_PRESETS.some(
                      (p) => p.name.toLowerCase() === sub.name.toLowerCase()
                    )
                )
                .map((sub) => {
                  const label = isBn && sub.nameBn ? sub.nameBn : sub.name;
                  const active =
                    subcategory.trim().toLowerCase() === sub.name.toLowerCase() ||
                    subcategory.trim() === sub.nameBn;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSubcategory(label)}
                      className={`min-h-[34px] px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        active
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
            </div>

            <input
              type="text"
              value={subcategory}
              maxLength={100}
              onChange={(e) => setSubcategory(e.target.value)}
              placeholder={
                isBn
                  ? 'অথবা নিজের মতো লিখুন (যেমন: দোকান ভাড়া, মায়ের ওষুধ)...'
                  : 'Or type custom subcategory...'
              }
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              {t('transaction_name', settings.language)}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isBn ? 'যেমন: দুপুরের খাবার / বাসা ভাড়া' : 'e.g. Lunch, Uber, Groceries'}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                {t('date_time', settings.language)}
              </label>
              <input
                type="datetime-local"
                value={dateTimeLocal}
                onChange={(e) => setDateTimeLocal(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                {isBn ? 'প্রাপক / দোকান (ঐচ্ছিক)' : 'Merchant / Party (Optional)'}
              </label>
              <input
                type="text"
                value={payeeOrPayer}
                onChange={(e) => setPayeeOrPayer(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              {t('notes', settings.language)}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Repeat size={15} className="text-sky-600" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {isBn ? 'নিয়মিত/মাসিক লেনদেন' : 'Recurring Transaction'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsRecurring((v) => !v)}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                isRecurring ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  isRecurring ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </TranslucentCard>

        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-extrabold shadow-lg"
        >
          {t('save', settings.language)}
        </button>
      </div>

      {/* Sheets & Modals */}
      <CategorySelectionSheet
        open={showCategorySheet}
        txType={type}
        selectedCategoryName={category}
        selectedSubcategoryName={subcategory}
        onSelect={(catName, subName) => {
          setCategory(catName);
          if (subName) setSubcategory(subName);
        }}
        onClose={() => setShowCategorySheet(false)}
        onCreateCategory={() => {
          setShowCategorySheet(false);
          openSubScreen('CATEGORIES');
        }}
      />

      <WalletSelectionSheet
        open={walletPickerTarget !== null}
        title={
          walletPickerTarget === 'TO'
            ? t('to_wallet', settings.language)
            : t('wallet_account', settings.language)
        }
        selectedAccountId={walletPickerTarget === 'TO' ? toAccountId : accountId}
        excludeAccountId={walletPickerTarget === 'TO' ? accountId : undefined}
        onSelect={(acc) => {
          if (walletPickerTarget === 'TO') setToAccountId(acc.id);
          else setAccountId(acc.id);
        }}
        onClose={() => setWalletPickerTarget(null)}
        onAddNewWallet={() => {
          setWalletPickerTarget(null);
          openSubScreen('EDIT_ACCOUNT');
        }}
      />

      <VoiceTransactionDialog
        open={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onApply={(parsed) => {
          handleTypeSwitch(parsed.type);
          if (parsed.hasConfidentAmount) setExpr(String(parsed.amount));
          if (parsed.description) setTitle(parsed.description);
          if (parsed.categoryName) setCategory(parsed.categoryName);
          if (parsed.subcategoryName) setSubcategory(parsed.subcategoryName);
          if (parsed.matchedAccountId) setAccountId(parsed.matchedAccountId);
        }}
      />

      <ReceiptReviewDialog
        open={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        onConfirm={(data) => {
          handleTypeSwitch('EXPENSE');
          setExpr(String(data.amount));
          setTitle(data.merchantName);
          setPayeeOrPayer(data.merchantName);
          setCategory(data.categoryName);
          setSubcategory(data.subcategoryName);
          if (data.accountId) setAccountId(data.accountId);
        }}
      />
    </div>
  );
}
